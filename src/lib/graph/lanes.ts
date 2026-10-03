import type { WorkNode } from "@/data/works";

import { WORK_BY_ID, WORK_GRAPHS, type WorkGraph } from "./relations";

// git log --graph–style lanes: a work continues its parent's lane, a
// convergence frees the extra lanes, and a `thread` keeps one lane for its
// whole run. `stepMap` defines which works share a row.
export function assignLanes(
  orderedWorks: WorkNode[],
  stepMap: Map<string, number>,
  graph: WorkGraph = WORK_GRAPHS.all,
): Map<string, number> {
  const lane = new Map<string, number>();
  const freeLanes: number[] = [];
  const consumedAsParent = new Set<string>();
  const idsInScope = new Set(orderedWorks.map((w) => w.id));
  let laneCount = 0;

  // Lanes already given to a work in the current row: never handed out
  // again in it, even if a convergence just freed them.
  let lanesInRow = new Set<number>();

  function claimLane(): number {
    freeLanes.sort((a, b) => a - b);
    const index = freeLanes.findIndex((l) => !lanesInRow.has(l));
    return index === -1 ? laneCount++ : freeLanes.splice(index, 1)[0];
  }

  const lastIndexForThread = new Map<string, number>();
  orderedWorks.forEach((w, i) => {
    if (w.thread) lastIndexForThread.set(w.thread, i);
  });
  const laneByThread = new Map<string, number>();
  // Freed once the row ends, so a later work in the same row can't collide.
  let pendingFrees: number[] = [];
  let lastSeenStep = Number.NaN;

  function isLaneStillOwned(l: number): boolean {
    for (const owned of laneByThread.values()) {
      if (owned === l) return true;
    }
    return false;
  }

  orderedWorks.forEach((work, index) => {
    const step = stepMap.get(work.id) ?? 0;
    if (step !== lastSeenStep) {
      freeLanes.push(...pendingFrees);
      pendingFrees = [];
      lastSeenStep = step;
      lanesInRow = new Set();
    }

    const parents = (graph.incoming.get(work.id) ?? []).filter(
      (p) => idsInScope.has(p) && lane.has(p),
    );
    let assigned: number;

    if (work.thread && laneByThread.has(work.thread)) {
      assigned = laneByThread.get(work.thread)!;
    } else if (parents.length === 0) {
      assigned = claimLane();
    } else if (parents.length === 1) {
      const parent = parents[0];
      const parentThread = WORK_BY_ID.get(parent)?.thread;
      const sameThread = !work.thread || work.thread === parentThread;
      if (sameThread && !consumedAsParent.has(parent)) {
        assigned = lane.get(parent)!;
        consumedAsParent.add(parent);
      } else {
        assigned = claimLane();
      }
    } else {
      const sameThreadParent = work.thread
        ? parents.find((p) => WORK_BY_ID.get(p)?.thread === work.thread)
        : undefined;
      const parentLanes = parents.map((p) => lane.get(p)!);
      const chosen = sameThreadParent
        ? lane.get(sameThreadParent)!
        : work.thread
          ? claimLane()
          : Math.min(...parentLanes);
      assigned = chosen;
      for (const p of parents) consumedAsParent.add(p);
      for (const p of parents) {
        const l = lane.get(p)!;
        if (l === chosen || isLaneStillOwned(l) || freeLanes.includes(l)) continue;
        freeLanes.push(l);
      }
    }

    lane.set(work.id, assigned);
    lanesInRow.add(assigned);
    if (work.thread) {
      laneByThread.set(work.thread, assigned);
      if (lastIndexForThread.get(work.thread) === index) {
        laneByThread.delete(work.thread);
        if (!isLaneStillOwned(assigned)) {
          pendingFrees.push(assigned);
        }
      }
    }
  });

  return lane;
}

// Moves the busiest lane (or `preferredId`'s) to the center and alternates
// the rest left/right.
export function centerMainLane(
  laneMap: Map<string, number>,
  works: WorkNode[],
  preferredId: string | undefined,
  stepMap: Map<string, number>,
  graph: WorkGraph = WORK_GRAPHS.all,
): { laneMap: Map<string, number>; mainLane: number } {
  let laneCount = laneMap.size > 0 ? Math.max(...laneMap.values()) + 1 : 1;
  if (laneCount <= 2) return { laneMap, mainLane: 0 };

  const weightByLane = new Map<number, number>();
  for (const work of works) {
    const lane = laneMap.get(work.id);
    if (lane === undefined) continue;
    const degree =
      (graph.incoming.get(work.id)?.length ?? 0) + (graph.outgoing.get(work.id)?.length ?? 0);
    weightByLane.set(lane, (weightByLane.get(lane) ?? 0) + degree);
  }

  let mainLane: number;
  const preferredLane = preferredId !== undefined ? laneMap.get(preferredId) : undefined;
  if (preferredLane !== undefined) {
    mainLane = preferredLane;
  } else {
    mainLane = 0;
    let maxWeight = -1;
    for (const [lane, weight] of weightByLane) {
      if (weight > maxWeight) {
        maxWeight = weight;
        mainLane = lane;
      }
    }
  }

  // Lane numbers get reused; move unrelated threads off the center lane.
  const threadCounts = new Map<string, number>();
  for (const work of works) {
    if (laneMap.get(work.id) === mainLane && work.thread) {
      threadCounts.set(work.thread, (threadCounts.get(work.thread) ?? 0) + 1);
    }
  }
  let mainThread: string | undefined;
  let mainThreadCount = 0;
  for (const [thread, count] of threadCounts) {
    if (count > mainThreadCount) {
      mainThreadCount = count;
      mainThread = thread;
    }
  }

  const centeredLaneMap = new Map(laneMap);
  if (mainThread) {
    for (const work of works) {
      if (laneMap.get(work.id) === mainLane && work.thread !== mainThread) {
        centeredLaneMap.set(work.id, laneCount++);
      }
    }
  }

  const firstRowByLane = new Map<number, number>();
  for (const work of works) {
    const lane = centeredLaneMap.get(work.id);
    if (lane === undefined) continue;
    const row = stepMap.get(work.id) ?? 0;
    const current = firstRowByLane.get(lane);
    if (current === undefined || row < current) firstRowByLane.set(lane, row);
  }

  const byRowThenWeight = (a: number, b: number) => {
    const rowDiff = (firstRowByLane.get(a) ?? 0) - (firstRowByLane.get(b) ?? 0);
    return rowDiff !== 0 ? rowDiff : (weightByLane.get(b) ?? 0) - (weightByLane.get(a) ?? 0);
  };
  const otherLanes = Array.from({ length: laneCount }, (_, i) => i)
    .filter((l) => l !== mainLane)
    .sort(byRowThenWeight);

  const left: number[] = [];
  const right: number[] = [];
  otherLanes.forEach((lane, index) => {
    (index % 2 === 0 ? left : right).push(lane);
  });
  left.sort((a, b) => -byRowThenWeight(a, b));
  right.sort(byRowThenWeight);

  const newOrder = [...left, mainLane, ...right];
  const remap = new Map(newOrder.map((oldLane, newIndex) => [oldLane, newIndex]));

  return {
    laneMap: new Map([...centeredLaneMap].map(([id, lane]) => [id, remap.get(lane)!])),
    mainLane: remap.get(mainLane)!,
  };
}
