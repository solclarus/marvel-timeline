import { WORKS, type WorkNode } from "@/data/works";

import { GROUPS, groupKeyOf, PHASE_GROUP, visibleGroups, type Grouping } from "./groups";
import { assignLanes, centerMainLane } from "./lanes";
import {
  canvasHeight,
  CARD_PAD_PX,
  GROUP_GAP_PX,
  LANE_PX,
  PHASE_CARD_DROP_PX,
  ROW_PX,
  SAGA_BREAK_PX,
  SAGA_TOP_PX,
  SUBGROUP_GAP_PX,
  UNPHASED_CLEARANCE,
  type GraphLayout,
  type Point,
} from "./metrics";
import { sagaOf, sagaStartSteps, WORK_BY_ID, type Saga, type WorkGraph } from "./relations";

export function recommendedTimeRank(): Map<string, number> {
  const included = WORKS.filter((w) => w.recommendedOrder !== null).sort(
    (a, b) => (a.recommendedOrder ?? 0) - (b.recommendedOrder ?? 0),
  );
  const excluded = WORKS.filter((w) => w.recommendedOrder === null).sort(
    (a, b) => a.chronologyOrder - b.chronologyOrder,
  );
  return new Map([...included, ...excluded].map((w, i) => [w.id, i]));
}

// A band is split into lane runs: grouped by Earth, one per franchise (so
// Netflix's Defenders Saga on 616 sits beside the MCU instead of weaving
// through it). In the run holding the MCU phases, works outside any phase
// (the One-Shots) are keyed apart so lanes are assigned without them; they
// are then placed just right of the phase band at their row.
function laneSubgroupOf(work: WorkNode, grouping: Grouping): string {
  const band = groupKeyOf(work, grouping.by);
  const key = grouping.by === "earth" ? `${band}|${work.franchise}` : band;
  const holdsPhases =
    grouping.by === "earth" ? work.franchise === "mcu" : band === PHASE_GROUP.franchise;
  return holdsPhases && band === PHASE_GROUP[grouping.by] && work.phase === undefined
    ? `${key}|unphased`
    : key;
}

const UNPHASED = "|unphased";
// The lane run an unphased work shares with its phased neighbors.
const runOf = (sub: string) => (sub.endsWith(UNPHASED) ? sub.slice(0, -UNPHASED.length) : sub);

// Lanes for works outside the phases: each sits just right of the saga frame
// covering its row (the saga's rightmost phased lane, plus one), stepping
// further right when a row has several. Returns the run's new lane count.
function placeUnphased(
  unphased: WorkNode[],
  phasedLanes: Map<string, number>,
  stepMap: Map<string, number>,
  laneMap: Map<string, number>,
): number {
  const bySaga = new Map<Saga, { minStep: number; maxLane: number }>();
  for (const [id, laneIndex] of phasedLanes) {
    const phase = WORK_BY_ID.get(id)?.phase;
    if (phase === undefined) continue;
    const step = stepMap.get(id) ?? 0;
    const entry = bySaga.get(sagaOf(phase));
    bySaga.set(sagaOf(phase), {
      minStep: Math.min(entry?.minStep ?? step, step),
      maxLane: Math.max(entry?.maxLane ?? laneIndex, laneIndex),
    });
  }
  const sagas = [...bySaga.entries()].sort((a, b) => a[1].minStep - b[1].minStep);
  const usedInRow = new Map<number, number>();
  let lanes = phasedLanes.size > 0 ? Math.max(...phasedLanes.values()) + 1 : 0;
  for (const work of unphased) {
    const step = stepMap.get(work.id) ?? 0;
    // The last saga starting at or above this row.
    const band = sagas.filter(([, e]) => e.minStep <= step).at(-1)?.[1] ?? sagas[0]?.[1];
    const offset = usedInRow.get(step) ?? 0;
    usedInRow.set(step, offset + 1);
    // Far enough out that the saga frame (two paddings past its posters)
    // keeps a padding's clearance from this poster too.
    const laneIndex = (band?.maxLane ?? -1) + 1 + UNPHASED_CLEARANCE + offset;
    laneMap.set(work.id, laneIndex);
    lanes = Math.max(lanes, laneIndex + 1);
  }
  return lanes;
}

function laneSubgroups(grouping: Grouping, band: string, works: WorkNode[]): string[] {
  const inBand = works.filter((w) => groupKeyOf(w, grouping.by) === band);
  const keys = new Set(inBand.map((w) => runOf(laneSubgroupOf(w, grouping))));
  const franchiseRank = new Map(GROUPS.franchise.map((f, i) => [f.key, i]));
  const rank = (key: string) => {
    const franchise = grouping.by === "earth" ? key.split("|")[1] : "";
    return franchiseRank.get(franchise as never) ?? 0;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

export function computeGitGraphLayout(grouping: Grouping, graph: WorkGraph): GraphLayout {
  const { step: stepMap, maxStep } = graph;
  const bands = visibleGroups(grouping).map((group) => group.key);
  const timeRank = recommendedTimeRank();
  const laneBySub = new Map<string, Map<string, number>>();
  const laneCount = new Map<string, number>();
  const sagaOutset = new Map<string, { left: number; right: number }>();
  const subsByBand = new Map(
    bands.map((band) => [band, laneSubgroups(grouping, band, graph.works)]),
  );
  const byStepThenTime = (a: WorkNode, b: WorkNode) => {
    const stepDiff = stepMap.get(a.id)! - stepMap.get(b.id)!;
    return stepDiff !== 0 ? stepDiff : timeRank.get(a.id)! - timeRank.get(b.id)!;
  };
  for (const sub of [...subsByBand.values()].flat()) {
    const worksInSub = graph.works
      .filter((w) => laneSubgroupOf(w, grouping) === sub)
      .sort(byStepThenTime);
    const { laneMap } = centerMainLane(
      assignLanes(worksInSub, stepMap, graph),
      worksInSub,
      undefined,
      stepMap,
      graph,
    );
    const unphased = graph.works
      .filter((w) => laneSubgroupOf(w, grouping) === sub + UNPHASED)
      .sort(byStepThenTime);
    const phasedLanes = new Map(laneMap);
    const lanes = placeUnphased(unphased, phasedLanes, stepMap, laneMap);
    laneCount.set(sub, Math.max(1, lanes));
    laneBySub.set(sub, laneMap);
    // Phase bands and saga frames nest two more paddings around their
    // posters; where they reach the run's edge, the run takes that much
    // more room so the card around it sits as far from its neighbors as
    // any other card.
    const phased = [...laneMap].filter(([id]) => {
      const work = WORK_BY_ID.get(id);
      return (
        work?.phase !== undefined && groupKeyOf(work, grouping.by) === PHASE_GROUP[grouping.by]
      );
    });
    if (phased.length > 0) {
      const lanesUsed = phased.map(([, lane]) => lane);
      const nest = (2 * CARD_PAD_PX) / LANE_PX;
      sagaOutset.set(sub, {
        left: Math.min(...lanesUsed) === 0 ? nest : 0,
        right: Math.max(...lanesUsed) === Math.max(1, lanes) - 1 ? nest : 0,
      });
    }
  }

  // Groups sit apart by a gap wide enough for their cards' outer padding;
  // franchises within an Earth by a smaller one.
  const subStart = new Map<string, number>();
  let total = 0;
  bands.forEach((band, i) => {
    if (i > 0) total += GROUP_GAP_PX / LANE_PX;
    subsByBand.get(band)!.forEach((sub, j) => {
      if (j > 0) total += SUBGROUP_GAP_PX / LANE_PX;
      total += sagaOutset.get(sub)?.left ?? 0;
      subStart.set(sub, total);
      total += laneCount.get(sub)!;
      total += sagaOutset.get(sub)?.right ?? 0;
    });
  });

  // Rows are ROW_PX apart, plus room above the first saga's frame and a
  // card padding between sagas: their frames nest two paddings past their
  // posters, more than a row's spare space.
  const sagaStarts = [...sagaStartSteps(graph).values()].sort((a, b) => a - b).slice(1);
  const rowY = (step: number) =>
    SAGA_TOP_PX +
    step * ROW_PX +
    ROW_PX / 2 +
    sagaStarts.filter((start) => start <= step).length * SAGA_BREAK_PX;
  const extraPx = SAGA_TOP_PX + sagaStarts.length * SAGA_BREAK_PX + PHASE_CARD_DROP_PX;
  const heightPx = canvasHeight(maxStep + 1, extraPx);
  const positions = new Map<string, Point>();
  const laneWidth = 100 / total;
  for (const work of graph.works) {
    const sub = runOf(laneSubgroupOf(work, grouping));
    const laneMap = laneBySub.get(sub);
    if (!laneMap) continue;
    const laneIndex = laneMap.get(work.id) ?? 0;
    const step = stepMap.get(work.id) ?? 0;
    positions.set(work.id, {
      x: (subStart.get(sub)! + laneIndex) * laneWidth + laneWidth / 2,
      y:
        ((rowY(step) +
          (groupKeyOf(work, grouping.by) === PHASE_GROUP[grouping.by] ? PHASE_CARD_DROP_PX : 0)) /
          heightPx) *
        100,
    });
  }

  return { positions, totalLanes: total, rowCount: maxStep + 1, headerPx: extraPx };
}
