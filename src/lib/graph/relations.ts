import { EDGES, HARD_EDGE_KINDS, WORKS, type WorkNode } from "@/data/works";

export type FocusMode = "chain" | "immediate";

function buildAdjacency(direction: "incoming" | "outgoing") {
  const map = new Map<string, string[]>();
  for (const edge of EDGES) {
    if (!HARD_EDGE_KINDS.includes(edge.kind)) continue;
    const [key, value] = direction === "incoming" ? [edge.to, edge.from] : [edge.from, edge.to];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(value);
  }
  return map;
}

// child → parents, prerequisite edges only ("reference" excluded).
export const INCOMING = buildAdjacency("incoming");
export const OUTGOING = buildAdjacency("outgoing");

export const WORK_BY_ID = new Map<string, WorkNode>(WORKS.map((w) => [w.id, w]));

// Row = longest path from a root, floored per MCU phase so phases stack
// as clean bands.
function buildGlobalSteps() {
  const phaseById = new Map(
    WORKS.filter((w) => w.phase !== undefined).map((w) => [w.id, w.phase!]),
  );
  const steps = new Map<string, number>();
  const visiting = new Set<string>();
  const floors = new Map<number, number>();

  function stepOf(id: string): number {
    const cached = steps.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = INCOMING.get(id) ?? [];
    const natural = parents.length === 0 ? 0 : Math.max(...parents.map(stepOf)) + 1;
    const phase = phaseById.get(id);
    const step = phase !== undefined ? Math.max(natural, floorOf(phase)) : natural;
    visiting.delete(id);
    steps.set(id, step);
    return step;
  }

  function floorOf(phase: number): number {
    if (phase <= 1) return 0;
    const cached = floors.get(phase);
    if (cached !== undefined) return cached;
    const previousPhaseWorks = WORKS.filter((w) => w.phase === phase - 1);
    const value =
      1 +
      (previousPhaseWorks.length > 0
        ? Math.max(...previousPhaseWorks.map((w) => stepOf(w.id)))
        : floorOf(phase - 1));
    floors.set(phase, value);
    return value;
  }

  for (const work of WORKS) stepOf(work.id);
  return steps;
}

export const GLOBAL_STEP = buildGlobalSteps();
export const MAX_STEP = Math.max(...GLOBAL_STEP.values());

// Negative for ancestors, positive for descendants.
export function getRelatedDistances(id: string, mode: FocusMode) {
  const distances = new Map<string, number>();
  const seen = new Set<string>([id]);
  const queue: Array<[string, number, "in" | "out"]> = [];

  for (const parent of INCOMING.get(id) ?? []) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    distances.set(parent, -1);
    queue.push([parent, 1, "in"]);
  }
  for (const child of OUTGOING.get(id) ?? []) {
    if (seen.has(child)) continue;
    seen.add(child);
    distances.set(child, 1);
    queue.push([child, 1, "out"]);
  }

  if (mode === "immediate") return distances;

  while (queue.length > 0) {
    const [current, dist, dir] = queue.shift()!;
    const neighbors = dir === "in" ? INCOMING.get(current) : OUTGOING.get(current);
    for (const next of neighbors ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      const nextDist = dist + 1;
      distances.set(next, dir === "in" ? -nextDist : nextDist);
      queue.push([next, nextDist, dir]);
    }
  }
  return distances;
}

// Only counts edges drawn in the current view, so a poster never gets a
// connector nub without a line. With a selection, edges outside `activeSet`
// fade out, so they don't count either.
export function computeEdgeVisibility(
  visibleIds: Set<string>,
  activeSet: Set<string> | null = null,
) {
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  for (const edge of EDGES) {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
    if (activeSet && (!activeSet.has(edge.from) || !activeSet.has(edge.to))) continue;
    hasOutgoing.add(edge.from);
    hasIncoming.add(edge.to);
  }
  return { hasIncoming, hasOutgoing };
}
