import { WORKS, type WorkNode } from "@/data/works";

import {
  GROUPS,
  groupKeyOf,
  isWorkVisible,
  PHASE_GROUP,
  visibleGroups,
  type Grouping,
} from "./groups";
import { assignLanes, centerMainLane } from "./lanes";
import { WORK_GRAPHS, type WorkGraph } from "./relations";

export type ViewMode = "recommended" | "release" | "chronology";
export type Axis = "x" | "y";

// Percentages (0–100) of the canvas.
export interface Point {
  x: number;
  y: number;
}

export interface GraphLayout {
  positions: Map<string, Point>;
  totalLanes: number;
  rowCount: number;
}

// Colorblind-safe order; re-validate before reordering.
const BAND_COLORS = [
  "rgba(42,120,214,0.10)", // blue
  "rgba(235,104,52,0.10)", // orange
  "rgba(27,175,122,0.10)", // aqua
  "rgba(237,161,0,0.12)", // yellow
  "rgba(232,123,164,0.10)", // magenta
  "rgba(0,131,0,0.10)", // green
];
const BAND_BORDER_COLORS = [
  "rgba(42,120,214,0.45)",
  "rgba(235,104,52,0.45)",
  "rgba(27,175,122,0.45)",
  "rgba(237,161,0,0.5)",
  "rgba(232,123,164,0.45)",
  "rgba(0,131,0,0.45)",
];

// Phases stack without overlapping, so one tint serves them all; their
// borders and labels tell them apart. A soft blue, clear of the MCU card's
// rose outline and the slate/gold edges.
const PHASE_COLOR = { color: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.4)" };

function bandColor(index: number) {
  return {
    color: BAND_COLORS[index % BAND_COLORS.length],
    borderColor: BAND_BORDER_COLORS[index % BAND_BORDER_COLORS.length],
  };
}

function visibleBands(grouping: Grouping) {
  return visibleGroups(grouping).map((group) => group.key);
}

function recommendedTimeRank(): Map<string, number> {
  const included = WORKS.filter((w) => w.recommendedOrder !== null).sort(
    (a, b) => (a.recommendedOrder ?? 0) - (b.recommendedOrder ?? 0),
  );
  const excluded = WORKS.filter((w) => w.recommendedOrder === null).sort(
    (a, b) => a.chronologyOrder - b.chronologyOrder,
  );
  return new Map([...included, ...excluded].map((w, i) => [w.id, i]));
}

// Timelines place works by rank rather than date so a long gap doesn't
// crush everything else.
export function computeLayout(
  mode: ViewMode,
  grouping: Grouping,
  graph: WorkGraph = WORK_GRAPHS.all,
): GraphLayout {
  return mode === "recommended"
    ? computeGitGraphLayout(grouping, graph)
    : computeTimelineLayout(mode, grouping, graph);
}

function computeTimelineLayout(
  mode: Exclude<ViewMode, "recommended">,
  grouping: Grouping,
  graph: WorkGraph,
): GraphLayout {
  const bands = visibleBands(grouping);
  const worksInScope = graph.works.filter((w) => isWorkVisible(w, grouping));
  const sorted = [...worksInScope].sort((a, b) => {
    return mode === "chronology"
      ? a.chronologyOrder - b.chronologyOrder
      : a.releaseDate.localeCompare(b.releaseDate);
  });
  const rank = new Map(sorted.map((w, i) => [w.id, i]));
  const denom = Math.max(1, sorted.length - 1);
  const rows = Math.max(1, bands.length);
  const rowHeight = 100 / rows;

  const positions = new Map<string, Point>();
  for (const work of worksInScope) {
    const rowIndex = Math.max(0, bands.indexOf(groupKeyOf(work, grouping.by)));
    positions.set(work.id, {
      x: ((rank.get(work.id) ?? 0) / denom) * 100,
      y: rowIndex * rowHeight + rowHeight / 2,
    });
  }

  return { positions, totalLanes: Math.max(1, sorted.length), rowCount: rows };
}

// Grouped by Earth, each band is split again by franchise, so a franchise
// sharing an Earth (Netflix's Defenders Saga on 616) keeps its own lanes
// beside the MCU's phases instead of weaving through them, joining where its
// edges meet.
function laneSubgroups(grouping: Grouping, band: string, works: WorkNode[]): string[] {
  if (grouping.by !== "earth") return [band];
  const inBand = works.filter((w) => groupKeyOf(w, "earth") === band);
  return GROUPS.franchise
    .map((f) => f.key)
    .filter((franchise) => inBand.some((w) => w.franchise === franchise))
    .map((franchise) => `${band}|${franchise}`);
}

function laneSubgroupOf(work: WorkNode, grouping: Grouping): string {
  const band = groupKeyOf(work, grouping.by);
  return grouping.by === "earth" ? `${band}|${work.franchise}` : band;
}

function computeGitGraphLayout(grouping: Grouping, graph: WorkGraph): GraphLayout {
  const { step: stepMap, maxStep } = graph;
  const bands = visibleBands(grouping);
  const timeRank = recommendedTimeRank();
  const laneBySub = new Map<string, Map<string, number>>();
  const laneCount = new Map<string, number>();
  const subsByBand = new Map(
    bands.map((band) => [band, laneSubgroups(grouping, band, graph.works)]),
  );
  for (const sub of [...subsByBand.values()].flat()) {
    const worksInSub = graph.works
      .filter((w) => laneSubgroupOf(w, grouping) === sub)
      .sort((a, b) => {
        const stepDiff = stepMap.get(a.id)! - stepMap.get(b.id)!;
        return stepDiff !== 0 ? stepDiff : timeRank.get(a.id)! - timeRank.get(b.id)!;
      });
    const { laneMap } = centerMainLane(
      assignLanes(worksInSub, stepMap, graph),
      worksInSub,
      undefined,
      stepMap,
      graph,
    );
    laneCount.set(sub, laneMap.size > 0 ? Math.max(...laneMap.values()) + 1 : 1);
    laneBySub.set(sub, laneMap);
  }

  // Groups sit apart by a gap wide enough for their cards' outer padding;
  // franchises within an Earth by a smaller one.
  const subStart = new Map<string, number>();
  let total = 0;
  bands.forEach((band, i) => {
    if (i > 0) total += GROUP_GAP_PX / LANE_PX;
    subsByBand.get(band)!.forEach((sub, j) => {
      if (j > 0) total += SUBGROUP_GAP_PX / LANE_PX;
      subStart.set(sub, total);
      total += laneCount.get(sub)!;
    });
  });

  const positions = new Map<string, Point>();
  const laneWidth = 100 / total;
  const rowHeight = 100 / (maxStep + 1);
  for (const work of graph.works) {
    const sub = laneSubgroupOf(work, grouping);
    const laneMap = laneBySub.get(sub);
    if (!laneMap) continue;
    const laneIndex = laneMap.get(work.id) ?? 0;
    const step = stepMap.get(work.id) ?? 0;
    positions.set(work.id, {
      x: (subStart.get(sub)! + laneIndex) * laneWidth + laneWidth / 2,
      y: step * rowHeight + rowHeight / 2,
    });
  }

  return { positions, totalLanes: total, rowCount: maxStep + 1 };
}

// Cells leave room around each 68x102 poster for the phase and group cards'
// inner padding.
const LANE_PX = 116;
const ROW_PX = 146;
// In recommended mode a group card reaches this far past its cells, so the
// phase bands inside it get a margin; GROUP_GAP_PX keeps neighbors apart.
const GROUP_CARD_OUTSET_PX = 14;
const GROUP_GAP_PX = 2 * GROUP_CARD_OUTSET_PX + 10;
// Between franchises sharing an Earth: keeps a phase band clear of the
// neighboring franchise's posters.
const SUBGROUP_GAP_PX = 32;

export function canvasSize(layout: GraphLayout) {
  return {
    width: Math.max(500, layout.totalLanes * LANE_PX),
    height: Math.max(500, layout.rowCount * ROW_PX),
  };
}

// One outlined card per franchise or Earth, hugging its works like the
// phase bands do.
export function computeGroupCards(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  const { width, height } = canvasSize(layout);
  const crossCount = mode === "recommended" ? layout.totalLanes : layout.rowCount;
  const flowCount = mode === "recommended" ? layout.rowCount : layout.totalLanes;
  // Half a cell on each axis. Recommended mode adds an outset around the
  // phase bands; timeline rows touch, so their cards keep a 10px gutter.
  const [padXPx, padYPx] =
    mode === "recommended"
      ? [GROUP_CARD_OUTSET_PX, GROUP_CARD_OUTSET_PX]
      : [GROUP_CARD_OUTSET_PX, -5];
  const padX = 50 / (mode === "recommended" ? crossCount : flowCount) + (padXPx / width) * 100;
  const padY = 50 / (mode === "recommended" ? flowCount : crossCount) + (padYPx / height) * 100;

  return visibleGroups(grouping).flatMap((group) => {
    const points = WORKS.filter((w) => groupKeyOf(w, grouping.by) === group.key)
      .map((w) => layout.positions.get(w.id))
      .filter((pos) => pos !== undefined);
    if (points.length === 0) return [];
    const xs = points.map((pos) => pos.x);
    const ys = points.map((pos) => pos.y);
    const left = Math.min(...xs) - padX;
    const top = Math.min(...ys) - padY;
    return [
      {
        ...group,
        left,
        top,
        width: Math.max(...xs) + padX - left,
        height: Math.max(...ys) + padY - top,
        // One work wide: its label centers instead of sitting top-left.
        singleColumn: Math.max(...xs) - Math.min(...xs) < 1e-6,
      },
    ];
  });
}

// The card under a point given in canvas percentages, if any.
export function groupCardAt<T extends { left: number; top: number; width: number; height: number }>(
  cards: T[],
  point: Point,
): T | undefined {
  return cards.find(
    (card) =>
      point.x >= card.left &&
      point.x <= card.left + card.width &&
      point.y >= card.top &&
      point.y <= card.top + card.height,
  );
}

export function computePhaseBands(
  mode: ViewMode,
  layout: GraphLayout,
  grouping: Grouping,
  graph: WorkGraph = WORK_GRAPHS.all,
) {
  if (mode !== "recommended") return [];
  const rowHeight = 100 / (graph.maxStep + 1);
  const laneWidth = 100 / layout.totalLanes;
  const gapPercent = (10 / canvasSize(layout).height) * 100;
  const byPhase = new Map<number, { minStep: number; minX: number; maxX: number }>();
  for (const work of WORKS) {
    if (work.phase === undefined || groupKeyOf(work, grouping.by) !== PHASE_GROUP[grouping.by]) {
      continue;
    }
    const pos = layout.positions.get(work.id);
    if (!pos) continue;
    const step = graph.step.get(work.id) ?? 0;
    const entry = byPhase.get(work.phase);
    if (!entry) {
      byPhase.set(work.phase, { minStep: step, minX: pos.x, maxX: pos.x });
    } else {
      entry.minStep = Math.min(entry.minStep, step);
      entry.minX = Math.min(entry.minX, pos.x);
      entry.maxX = Math.max(entry.maxX, pos.x);
    }
  }
  const phases = [...byPhase.keys()].sort((a, b) => a - b);
  return phases.map((phase, i) => {
    const entry = byPhase.get(phase)!;
    const next = phases[i + 1] !== undefined ? byPhase.get(phases[i + 1]) : undefined;
    const bottomStep = next ? next.minStep : graph.maxStep + 1;
    return {
      phase,
      top: entry.minStep * rowHeight + gapPercent / 2,
      height: (bottomStep - entry.minStep) * rowHeight - gapPercent,
      left: entry.minX - laneWidth / 2,
      width: entry.maxX - entry.minX + laneWidth,
      singleColumn: entry.maxX - entry.minX < 1e-6,
      ...PHASE_COLOR,
    };
  });
}

export function computeEraBands(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  if (mode === "recommended") return [];
  const dated = WORKS.filter((w) => isWorkVisible(w, grouping))
    .map((work) => {
      const pos = layout.positions.get(work.id);
      const releaseYear = Number(work.releaseDate.slice(0, 4));
      const year = mode === "release" ? releaseYear : (work.setYear ?? releaseYear);
      return pos ? { pos, decade: Math.floor(year / 10) * 10 } : null;
    })
    .filter((e) => e !== null)
    .sort((a, b) => a.pos.x - b.pos.x);
  if (dated.length === 0) return [];

  const runs: Array<{ decade: number; minX: number; maxX: number }> = [];
  for (const { pos, decade } of dated) {
    const last = runs[runs.length - 1];
    if (last && last.decade === decade) last.maxX = pos.x;
    else runs.push({ decade, minX: pos.x, maxX: pos.x });
  }

  const decadeOrder = [...new Set(runs.map((r) => r.decade))].sort((a, b) => a - b);
  const colorIndex = new Map(decadeOrder.map((d, i) => [d, i]));

  return runs.map((run, i) => {
    const left = i === 0 ? 0 : (run.minX + runs[i - 1].maxX) / 2;
    const right = i === runs.length - 1 ? 100 : (run.maxX + runs[i + 1].minX) / 2;
    return {
      key: `${run.decade}-${i}`,
      label: `${run.decade}s`,
      left,
      width: right - left,
      ...bandColor(colorIndex.get(run.decade) ?? 0),
    };
  });
}

export function computeEdgeGeometry(
  flowAxisSpan: number,
  flowStepCount: number,
  crossAxisCount: number,
  nodeFlowSize: number,
) {
  const nodeHalfSizePercent = (nodeFlowSize / 2 / flowAxisSpan) * 100;
  const flowStepPercent = 100 / flowStepCount;
  const tightestGapPercent = Math.max(0.1, flowStepPercent - 2 * nodeHalfSizePercent);
  const stubPercent = tightestGapPercent / 2;
  const crossStepPercent = 100 / crossAxisCount;
  const cornerRadius = Math.min(1.5, stubPercent, crossStepPercent / 2);
  return { nodeHalfSizePercent, stubPercent, cornerRadius };
}
