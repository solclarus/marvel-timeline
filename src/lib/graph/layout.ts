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
  // Timelines: each decade's horizontal extent, in canvas percentages.
  decadeSpans?: Map<number, { left: number; right: number }>;
}

// Decade bands step through the rainbow, red (oldest) to violet (newest),
// so the backdrop itself reads as time moving left to right. Each band is
// one flat, soft color; `step` runs 0..1 across the decades on screen.
function decadeTint(step: number) {
  const hue = Math.round(step * 270);
  return {
    color: `hsla(${hue}, 85%, 55%, 0.12)`,
    borderColor: `hsla(${hue}, 70%, 45%, 0.5)`,
  };
}

// Phases stack without overlapping, so one tint serves them all; their
// borders and labels tell them apart. A soft blue, clear of the MCU card's
// rose outline and the slate/gold edges.
const PHASE_COLOR = { color: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.4)" };

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

// The year a timeline places a work at: its release year, or for the
// chronology its in-story year when known.
export function timelineYear(work: WorkNode, mode: Exclude<ViewMode, "recommended">): number {
  const releaseYear = Number(work.releaseDate.slice(0, 4));
  return mode === "release" ? releaseYear : (work.setYear ?? releaseYear);
}

// Every decade gets at least this many columns, so a decade with one or two
// works still makes a band wide enough to read beside its neighbors.
const MIN_DECADE_COLUMNS = 3;

// Lays consecutive slots (one per work, or per year) into columns, padding
// any decade narrower than MIN_DECADE_COLUMNS evenly on both sides. Returns
// each slot's first column and the total.
function placeSlots(slots: Array<{ key: string; decade: number; width: number }>) {
  const start = new Map<string, number>();
  const decadeColumns = new Map<number, { from: number; to: number }>();
  let column = 0;
  let i = 0;
  while (i < slots.length) {
    const decade = slots[i].decade;
    let j = i;
    let width = 0;
    while (j < slots.length && slots[j].decade === decade) width += slots[j++].width;
    const pad = Math.max(0, MIN_DECADE_COLUMNS - width);
    const from = column;
    column += Math.floor(pad / 2);
    for (; i < j; i++) {
      start.set(slots[i].key, column);
      column += slots[i].width;
    }
    column += pad - Math.floor(pad / 2);
    decadeColumns.set(decade, { from, to: column });
  }
  return { start, columns: column, decadeColumns };
}

function toDecadeSpans(decadeColumns: Map<number, { from: number; to: number }>, columns: number) {
  return new Map(
    [...decadeColumns].map(([decade, { from, to }]) => [
      decade,
      { left: (from / columns) * 100, right: (to / columns) * 100 },
    ]),
  );
}

function computeTimelineLayout(
  mode: Exclude<ViewMode, "recommended">,
  grouping: Grouping,
  graph: WorkGraph,
): GraphLayout {
  const bands = visibleBands(grouping);
  const worksInScope = graph.works.filter((w) => isWorkVisible(w, grouping));
  const rows = Math.max(1, bands.length);
  const rowHeight = 100 / rows;
  const rowOf = (work: WorkNode) => Math.max(0, bands.indexOf(groupKeyOf(work, grouping.by)));
  const decadeOf = (year: number) => Math.floor(year / 10) * 10;
  // Columns sit at their centers, so padding at either end stays inside.
  const xOf = (column: number, columns: number) => ((column + 0.5) / Math.max(1, columns)) * 100;

  // Release dates already run in one order across every row: one column per
  // work, by date.
  if (mode === "release") {
    const sorted = [...worksInScope].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    const { start, columns, decadeColumns } = placeSlots(
      sorted.map((work) => ({
        key: work.id,
        decade: decadeOf(timelineYear(work, mode)),
        width: 1,
      })),
    );
    const positions = new Map<string, Point>();
    for (const work of sorted) {
      positions.set(work.id, {
        x: xOf(start.get(work.id)!, columns),
        y: rowOf(work) * rowHeight + rowHeight / 2,
      });
    }
    return {
      positions,
      totalLanes: Math.max(1, columns),
      rowCount: rows,
      decadeSpans: toDecadeSpans(decadeColumns, Math.max(1, columns)),
    };
  }

  // The chronology's order is curated per franchise, so it can't be one
  // sequence across rows. Instead every row shares a year axis: each year
  // gets as many columns as its busiest row needs (empty years take none),
  // and a row's works within a year keep their chronology order.
  const byRowYear = new Map<string, WorkNode[]>();
  for (const work of worksInScope) {
    const key = `${rowOf(work)}|${timelineYear(work, mode)}`;
    if (!byRowYear.has(key)) byRowYear.set(key, []);
    byRowYear.get(key)!.push(work);
  }
  const years = [...new Set(worksInScope.map((w) => timelineYear(w, mode)))].sort((a, b) => a - b);
  const { start, columns, decadeColumns } = placeSlots(
    years.map((year) => {
      let widest = 0;
      for (let row = 0; row < rows; row++) {
        widest = Math.max(widest, byRowYear.get(`${row}|${year}`)?.length ?? 0);
      }
      return { key: String(year), decade: decadeOf(year), width: widest };
    }),
  );

  const positions = new Map<string, Point>();
  for (const [key, works] of byRowYear) {
    const [row, year] = key.split("|").map(Number);
    works
      .sort((a, b) => a.chronologyOrder - b.chronologyOrder)
      .forEach((work, i) => {
        positions.set(work.id, {
          x: xOf(start.get(String(year))! + i, columns),
          y: row * rowHeight + rowHeight / 2,
        });
      });
  }
  return {
    positions,
    totalLanes: Math.max(1, columns),
    rowCount: rows,
    decadeSpans: toDecadeSpans(decadeColumns, Math.max(1, columns)),
  };
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

// Visible works in left-to-right order with the year a timeline sorts them
// by: release year, or the in-story year (falling back to release) for the
// chronology.
function datedWorks(
  mode: Exclude<ViewMode, "recommended">,
  layout: GraphLayout,
  grouping: Grouping,
) {
  return WORKS.filter((w) => isWorkVisible(w, grouping))
    .map((work) => {
      const pos = layout.positions.get(work.id);
      const year = timelineYear(work, mode);
      return pos ? { pos, year, decade: Math.floor(year / 10) * 10 } : null;
    })
    .filter((e) => e !== null)
    .sort((a, b) => a.pos.x - b.pos.x);
}

// A faint line wherever the year changes between neighboring works, labeled
// with the year that starts there. Works sit by rank, not date, so the lines
// aren't evenly spaced. Decade changes are left to the decade bands' edges.
export function computeYearMarks(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  if (mode === "recommended") return [];
  const dated = datedWorks(mode, layout, grouping);
  return dated.flatMap((current, i) => {
    const previous = dated[i - 1];
    if (!previous || previous.year === current.year || previous.decade !== current.decade) {
      return [];
    }
    return [
      { key: `${current.year}-${i}`, year: current.year, x: (previous.pos.x + current.pos.x) / 2 },
    ];
  });
}

export function computeEraBands(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  if (mode === "recommended") return [];
  const dated = datedWorks(mode, layout, grouping);
  if (dated.length === 0) return [];
  // Timelines run in year order, so each decade is one contiguous span; the
  // layout records it, padding included.
  const decades = [...new Set(dated.map((d) => d.decade))].sort((a, b) => a - b);
  return decades.flatMap((decade, i) => {
    const span = layout.decadeSpans?.get(decade);
    if (!span) return [];
    return [
      {
        key: String(decade),
        decade,
        left: span.left,
        width: span.right - span.left,
        ...decadeTint(decades.length > 1 ? i / (decades.length - 1) : 1),
      },
    ];
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
