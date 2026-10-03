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
import { sagaOf, WORK_BY_ID, WORK_GRAPHS, type Saga, type WorkGraph } from "./relations";

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
  // Timelines: a strip above the rows, in pixels, for the decade labels and
  // year numbers, so they never sit on the first row's group labels.
  headerPx?: number;
  // Timelines: each decade's horizontal extent, in canvas percentages.
  decadeSpans?: Map<number, { left: number; right: number }>;
}

// Decade bands step through the rainbow, red (oldest) to violet (newest),
// so the backdrop itself reads as time moving left to right. Each band is
// one flat, soft color; `step` runs 0..1 across the decades on screen.
function decadeTint(step: number) {
  const hue = Math.round(step * 270);
  return {
    // Tuned for the dark canvas: enough color to tell decades apart without
    // lifting the backdrop over the posters.
    color: `hsla(${hue}, 80%, 55%, 0.14)`,
    borderColor: `hsla(${hue}, 75%, 62%, 0.45)`,
  };
}

// Phases stack without overlapping, so one tint serves them all; their
// borders and labels tell them apart. A soft blue, clear of the MCU card's
// rose outline and the slate/gold edges.
const PHASE_COLOR = { color: "rgba(96,165,250,0.09)", borderColor: "rgba(96,165,250,0.45)" };

function visibleBands(grouping: Grouping) {
  return visibleGroups(grouping).map((group) => group.key);
}

export function recommendedTimeRank(): Map<string, number> {
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

// A string that sorts works the way a timeline places them: release date,
// or in-story year then chronology order.
export function timelineSortKey(work: WorkNode, mode: Exclude<ViewMode, "recommended">): string {
  if (mode === "release") return work.releaseDate;
  const order = String(Math.round(work.chronologyOrder * 1000)).padStart(9, "0");
  return `${timelineYear(work, mode)}|${order}`;
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
  const worksInScope = graph.works.filter((w) => isWorkVisible(w, grouping));
  // Rows run from the group with the earliest work in view down to the
  // latest, so the timeline reads top-left to bottom-right; a group the
  // filters have emptied gets no row. Ties keep the usual group order.
  const earliest = new Map<string, string>();
  for (const work of worksInScope) {
    const key = groupKeyOf(work, grouping.by);
    const sortKey = timelineSortKey(work, mode);
    const current = earliest.get(key);
    if (current === undefined || sortKey < current) earliest.set(key, sortKey);
  }
  const bands = visibleBands(grouping)
    .filter((band) => earliest.has(band))
    .sort((a, b) => earliest.get(a)!.localeCompare(earliest.get(b)!));
  const rows = Math.max(1, bands.length);
  const height = canvasHeight(rows, TIMELINE_HEADER_PX);
  const headerPercent = (TIMELINE_HEADER_PX / height) * 100;
  const rowHeight = (100 - headerPercent) / rows;
  const rowY = (row: number) => headerPercent + row * rowHeight + rowHeight / 2;
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
        y: rowY(rowOf(work)),
      });
    }
    return {
      positions,
      totalLanes: Math.max(1, columns),
      rowCount: rows,
      headerPx: TIMELINE_HEADER_PX,
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
          y: rowY(row),
        });
      });
  }
  return {
    positions,
    totalLanes: Math.max(1, columns),
    rowCount: rows,
    headerPx: TIMELINE_HEADER_PX,
    decadeSpans: toDecadeSpans(decadeColumns, Math.max(1, columns)),
  };
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
    const laneIndex = (band?.maxLane ?? -1) + 1 + offset;
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

function computeGitGraphLayout(grouping: Grouping, graph: WorkGraph): GraphLayout {
  const { step: stepMap, maxStep } = graph;
  const bands = visibleBands(grouping);
  const timeRank = recommendedTimeRank();
  const laneBySub = new Map<string, Map<string, number>>();
  const laneCount = new Map<string, number>();
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
    const unphased = graph.works
      .filter((w) => laneSubgroupOf(w, grouping) === sub + UNPHASED)
      .sort(byStepThenTime);
    const phasedLanes = new Map(laneMap);
    const lanes = placeUnphased(unphased, phasedLanes, stepMap, laneMap);
    laneCount.set(sub, Math.max(1, lanes));
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
    const sub = runOf(laneSubgroupOf(work, grouping));
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
const LANE_PX = 128;
const ROW_PX = 170;
// In recommended mode a group card reaches this far past its cells, so the
// phase bands inside it get a margin; GROUP_GAP_PX keeps neighbors apart.
const GROUP_CARD_OUTSET_PX = 14;
// Wide enough for the MCU card, which reaches further to hold the saga
// frames (SAGA_PAD_PX plus SAGA_CARD_PAD_PX past its lanes).
const GROUP_GAP_PX = 2 * GROUP_CARD_OUTSET_PX + 40;
// Between franchises sharing an Earth: keeps a phase band clear of the
// neighboring franchise's posters.
const SUBGROUP_GAP_PX = 32;

const TIMELINE_HEADER_PX = 48;

function canvasHeight(rowCount: number, headerPx = 0) {
  return Math.max(500, rowCount * ROW_PX + headerPx);
}

export function canvasSize(layout: GraphLayout) {
  return {
    width: Math.max(500, layout.totalLanes * LANE_PX),
    height: canvasHeight(layout.rowCount, layout.headerPx),
  };
}

// One outlined card per franchise or Earth, hugging its works like the
// phase bands do.
export function computeGroupCards(
  mode: ViewMode,
  layout: GraphLayout,
  grouping: Grouping,
  sagaBands: ReturnType<typeof computeSagaBands> = [],
) {
  const { width, height } = canvasSize(layout);
  // Half a cell on each axis. Recommended mode adds an outset around the
  // phase bands; timeline rows touch, so their cards keep a 10px gutter.
  const [padXPx, padYPx] =
    mode === "recommended"
      ? [GROUP_CARD_OUTSET_PX, GROUP_CARD_OUTSET_PX]
      : [GROUP_CARD_OUTSET_PX, -5];
  // Half a lane and half a row (rows exclude the timeline header).
  const rowsHeight = height - (layout.headerPx ?? 0);
  const padX = 50 / layout.totalLanes + (padXPx / width) * 100;
  const padY = ((rowsHeight / layout.rowCount / 2 + padYPx) / height) * 100;

  return visibleGroups(grouping).flatMap((group) => {
    const points = WORKS.filter((w) => groupKeyOf(w, grouping.by) === group.key)
      .map((w) => layout.positions.get(w.id))
      .filter((pos) => pos !== undefined);
    if (points.length === 0) return [];
    const xs = points.map((pos) => pos.x);
    const ys = points.map((pos) => pos.y);
    let left = Math.min(...xs) - padX;
    let top = Math.min(...ys) - padY;
    let right = Math.max(...xs) + padX;
    let bottom = Math.max(...ys) + padY;
    // The card holding the phases also wraps their saga frames, with room
    // for its own label above the first saga's.
    if (group.key === PHASE_GROUP[grouping.by]) {
      const side = (SAGA_CARD_PAD_PX.side / width) * 100;
      const vSide = (SAGA_CARD_PAD_PX.side / height) * 100;
      const vTop = (SAGA_CARD_PAD_PX.top / height) * 100;
      for (const saga of sagaBands) {
        left = Math.min(left, saga.left - side);
        right = Math.max(right, saga.left + saga.width + side);
        top = Math.min(top, saga.top - vTop);
        bottom = Math.max(bottom, saga.top + saga.height + vSide);
      }
    }
    return [
      {
        ...group,
        left,
        top,
        width: right - left,
        height: bottom - top,
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
  const byPhase = new Map<
    number,
    { minStep: number; maxStep: number; minX: number; maxX: number }
  >();
  for (const work of WORKS) {
    if (work.phase === undefined || groupKeyOf(work, grouping.by) !== PHASE_GROUP[grouping.by]) {
      continue;
    }
    const pos = layout.positions.get(work.id);
    if (!pos) continue;
    const step = graph.step.get(work.id) ?? 0;
    const entry = byPhase.get(work.phase);
    if (!entry) {
      byPhase.set(work.phase, { minStep: step, maxStep: step, minX: pos.x, maxX: pos.x });
    } else {
      entry.minStep = Math.min(entry.minStep, step);
      entry.maxStep = Math.max(entry.maxStep, step);
      entry.minX = Math.min(entry.minX, pos.x);
      entry.maxX = Math.max(entry.maxX, pos.x);
    }
  }
  // Each band covers just the rows and lanes its own works sit in, so a
  // filtered phase shrinks with them rather than reaching to the next one.
  return [...byPhase.entries()]
    .sort(([a], [b]) => a - b)
    .map(([phase, entry]) => ({
      phase,
      saga: sagaOf(phase),
      top: entry.minStep * rowHeight + gapPercent / 2,
      height: (entry.maxStep + 1 - entry.minStep) * rowHeight - gapPercent,
      left: entry.minX - laneWidth / 2,
      width: entry.maxX - entry.minX + laneWidth,
      singleColumn: entry.maxX - entry.minX < 1e-6,
      ...PHASE_COLOR,
    }));
}

// How far a saga's frame reaches past its phase bands. The top reaches into
// the empty row above each saga (see `buildSteps`), so the saga's label and
// its first phase's label sit apart.
const SAGA_PAD_PX = { side: 18, top: 40 };
// Between a saga frame and the card around it (the MCU, or Earth-616).
const SAGA_CARD_PAD_PX = { side: 18, top: 40 };

// One frame per saga around its phase bands.
export function computeSagaBands(
  layout: GraphLayout,
  phaseBands: ReturnType<typeof computePhaseBands>,
) {
  const { width, height } = canvasSize(layout);
  const padX = (SAGA_PAD_PX.side / width) * 100;
  const padTop = (SAGA_PAD_PX.top / height) * 100;
  const padBottom = (SAGA_PAD_PX.side / height) * 100;
  const bySaga = new Map<Saga, typeof phaseBands>();
  for (const band of phaseBands) {
    if (!bySaga.has(band.saga)) bySaga.set(band.saga, []);
    bySaga.get(band.saga)!.push(band);
  }
  return [...bySaga.entries()].map(([saga, bands]) => {
    const left = Math.min(...bands.map((b) => b.left)) - padX;
    const top = Math.min(...bands.map((b) => b.top)) - padTop;
    const right = Math.max(...bands.map((b) => b.left + b.width)) + padX;
    const bottom = Math.max(...bands.map((b) => b.top + b.height)) + padBottom;
    return { saga, left, top, width: right - left, height: bottom - top };
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
  nodeFlowSize: number,
) {
  const nodeHalfSizePercent = (nodeFlowSize / 2 / flowAxisSpan) * 100;
  const flowStepPercent = 100 / flowStepCount;
  const tightestGapPercent = Math.max(0.1, flowStepPercent - 2 * nodeHalfSizePercent);
  const stubPercent = tightestGapPercent / 2;
  return { nodeHalfSizePercent, stubPercent };
}
