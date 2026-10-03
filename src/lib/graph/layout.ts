import { WORKS } from "@/data/works";

import { groupKeyOf, isWorkVisible, PHASE_GROUP, visibleGroups, type Grouping } from "./groups";
import { assignLanes, centerMainLane } from "./lanes";
import { GLOBAL_STEP, MAX_STEP } from "./relations";

export type ViewMode = "recommended" | "release" | "chronology";
// "compact" redraws only the selection and its relatives.
export type DisplayMode = "inline" | "compact";
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
export function computeLayout(mode: ViewMode, grouping: Grouping): GraphLayout {
  return mode === "recommended"
    ? computeGitGraphLayout(grouping)
    : computeTimelineLayout(mode, grouping);
}

function computeTimelineLayout(
  mode: Exclude<ViewMode, "recommended">,
  grouping: Grouping,
): GraphLayout {
  const bands = visibleBands(grouping);
  const worksInScope = WORKS.filter((w) => isWorkVisible(w, grouping));
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

function computeGitGraphLayout(grouping: Grouping): GraphLayout {
  const bands = visibleBands(grouping);
  const timeRank = recommendedTimeRank();
  const laneByBand = new Map<string, Map<string, number>>();
  const laneCount = new Map<string, number>();
  for (const band of bands) {
    const worksInBand = WORKS.filter((w) => groupKeyOf(w, grouping.by) === band).sort((a, b) => {
      const stepDiff = GLOBAL_STEP.get(a.id)! - GLOBAL_STEP.get(b.id)!;
      return stepDiff !== 0 ? stepDiff : timeRank.get(a.id)! - timeRank.get(b.id)!;
    });
    const { laneMap } = centerMainLane(
      assignLanes(worksInBand, GLOBAL_STEP),
      worksInBand,
      undefined,
      GLOBAL_STEP,
    );
    laneCount.set(band, laneMap.size > 0 ? Math.max(...laneMap.values()) + 1 : 1);
    laneByBand.set(band, laneMap);
  }

  const bandStart = new Map<string, number>();
  let total = 0;
  for (const band of bands) {
    bandStart.set(band, total);
    total += laneCount.get(band)!;
  }

  const positions = new Map<string, Point>();
  const laneWidth = 100 / total;
  const rowHeight = 100 / (MAX_STEP + 1);
  for (const work of WORKS) {
    const band = groupKeyOf(work, grouping.by);
    const laneMap = laneByBand.get(band);
    if (!laneMap) continue;
    const laneIndex = laneMap.get(work.id) ?? 0;
    const step = GLOBAL_STEP.get(work.id) ?? 0;
    positions.set(work.id, {
      x: (bandStart.get(band)! + laneIndex) * laneWidth + laneWidth / 2,
      y: step * rowHeight + rowHeight / 2,
    });
  }

  return { positions, totalLanes: total, rowCount: MAX_STEP + 1 };
}

export function canvasSize(layout: GraphLayout) {
  return {
    width: Math.max(500, layout.totalLanes * 100),
    height: Math.max(500, layout.rowCount * 130),
  };
}

export function computeGroupRows(mode: ViewMode, grouping: Grouping) {
  if (mode === "recommended") return [];
  const groups = visibleGroups(grouping);
  const rowHeight = 100 / Math.max(1, groups.length);
  return groups.map((group, i) => ({ ...group, top: i * rowHeight, height: rowHeight }));
}

// Recommended mode's bands are lane spans; labeled only when there's more
// than one to tell apart.
export function computeGroupColumns(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  const groups = visibleGroups(grouping);
  if (mode !== "recommended" || groups.length < 2) return [];
  const laneWidth = 100 / layout.totalLanes;
  return groups.flatMap((group) => {
    const xs = WORKS.filter((w) => groupKeyOf(w, grouping.by) === group.key)
      .map((w) => layout.positions.get(w.id)?.x)
      .filter((x) => x !== undefined);
    if (xs.length === 0) return [];
    const left = Math.min(...xs) - laneWidth / 2;
    return [{ ...group, left, width: Math.max(...xs) + laneWidth / 2 - left }];
  });
}

export function computePhaseBands(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  if (mode !== "recommended") return [];
  const rowHeight = 100 / (MAX_STEP + 1);
  const laneWidth = 100 / layout.totalLanes;
  const gapPercent = (10 / canvasSize(layout).height) * 100;
  const byPhase = new Map<number, { minStep: number; minX: number; maxX: number }>();
  for (const work of WORKS) {
    if (work.phase === undefined || groupKeyOf(work, grouping.by) !== PHASE_GROUP[grouping.by]) {
      continue;
    }
    const pos = layout.positions.get(work.id);
    if (!pos) continue;
    const step = GLOBAL_STEP.get(work.id) ?? 0;
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
    const bottomStep = next ? next.minStep : MAX_STEP + 1;
    return {
      phase,
      top: entry.minStep * rowHeight + gapPercent / 2,
      height: (bottomStep - entry.minStep) * rowHeight - gapPercent,
      left: entry.minX - laneWidth / 2,
      width: entry.maxX - entry.minX + laneWidth,
      ...bandColor(phase - 1),
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

export interface FocusLayout extends GraphLayout {
  width: number;
  height: number;
}

// Rows are hop distance from the selection rather than GLOBAL_STEP, so e.g.
// all of Endgame's direct parents share a row.
export function computeFocusLayout(
  selectedId: string,
  distances: Map<string, number>,
): FocusLayout {
  const localStep = new Map<string, number>([[selectedId, 0], ...distances]);
  const relatedWorks = WORKS.filter((w) => localStep.has(w.id)).sort((a, b) => {
    const stepDiff = localStep.get(a.id)! - localStep.get(b.id)!;
    return stepDiff !== 0 ? stepDiff : a.chronologyOrder - b.chronologyOrder;
  });

  const { laneMap } = centerMainLane(
    assignLanes(relatedWorks, localStep),
    relatedWorks,
    selectedId,
    localStep,
  );
  const totalLanes = laneMap.size > 0 ? Math.max(...laneMap.values()) + 1 : 1;

  const stepValues = [...new Set(relatedWorks.map((w) => localStep.get(w.id)!))].sort(
    (a, b) => a - b,
  );
  const rowIndexByStep = new Map(stepValues.map((step, i) => [step, i]));
  const rowCount = Math.max(1, stepValues.length);
  const laneWidth = 100 / totalLanes;
  const rowHeight = 100 / rowCount;

  const positions = new Map<string, Point>();
  for (const work of relatedWorks) {
    const lane = laneMap.get(work.id) ?? 0;
    const rowIndex = rowIndexByStep.get(localStep.get(work.id)!) ?? 0;
    positions.set(work.id, {
      x: lane * laneWidth + laneWidth / 2,
      y: rowIndex * rowHeight + rowHeight / 2,
    });
  }

  return {
    positions,
    totalLanes,
    rowCount,
    width: Math.max(240, totalLanes * 100),
    height: Math.max(240, rowCount * 150),
  };
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
