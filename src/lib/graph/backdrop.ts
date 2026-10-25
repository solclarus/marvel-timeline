import { isUpcoming, WORKS } from "@/data/works";

import { groupKeyOf, PHASE_GROUP, visibleGroups, type Grouping } from "./groups";
import {
  canvasSize,
  CARD_PAD_PX,
  POSTER_PX,
  TIMELINE_PX,
  type GraphLayout,
  type Point,
  type ViewMode,
} from "./metrics";
import { sagaOf, WORK_BY_ID, type Saga } from "./relations";
import { releaseMonth, timelineYear } from "./timeline-layout";

// The cards and bands drawn behind the map: franchise/Earth cards, MCU saga
// frames and phase bands, and the timelines' decade bands and months.

// Decade bands step through the rainbow, red (oldest) to violet (newest),
// so the backdrop itself reads as time moving down. Each band is
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

// One outlined card per franchise or Earth, hugging its works like the
// phase bands do. Timelines mix the groups within each year, so they have
// none; a mark under each poster tells the groups apart there.
export function computeGroupCards(
  mode: ViewMode,
  layout: GraphLayout,
  grouping: Grouping,
  sagaBands: ReturnType<typeof computeSagaBands> = [],
) {
  if (mode !== "recommended") return [];
  const { width, height } = canvasSize(layout);
  const padX = ((POSTER_PX.width / 2 + CARD_PAD_PX) / width) * 100;
  const padY = ((POSTER_PX.height / 2 + CARD_PAD_PX) / height) * 100;

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
    // The card holding the phases also wraps their saga frames.
    if (mode === "recommended" && group.key === PHASE_GROUP[grouping.by]) {
      const sideX = (CARD_PAD_PX / width) * 100;
      const sideY = (CARD_PAD_PX / height) * 100;
      for (const saga of sagaBands) {
        left = Math.min(left, saga.left - sideX);
        right = Math.max(right, saga.left + saga.width + sideX);
        top = Math.min(top, saga.top - sideY);
        bottom = Math.max(bottom, saga.top + saga.height + sideY);
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

export function computePhaseBands(mode: ViewMode, layout: GraphLayout, grouping: Grouping) {
  if (mode !== "recommended") return [];
  const { width, height } = canvasSize(layout);
  const padX = ((POSTER_PX.width / 2 + CARD_PAD_PX) / width) * 100;
  const padY = ((POSTER_PX.height / 2 + CARD_PAD_PX) / height) * 100;
  const byPhase = new Map<number, { minY: number; maxY: number; minX: number; maxX: number }>();
  for (const work of WORKS) {
    if (work.phase === undefined || groupKeyOf(work, grouping.by) !== PHASE_GROUP[grouping.by]) {
      continue;
    }
    const pos = layout.positions.get(work.id);
    if (!pos) continue;
    const entry = byPhase.get(work.phase);
    if (!entry) {
      byPhase.set(work.phase, { minY: pos.y, maxY: pos.y, minX: pos.x, maxX: pos.x });
    } else {
      entry.minY = Math.min(entry.minY, pos.y);
      entry.maxY = Math.max(entry.maxY, pos.y);
      entry.minX = Math.min(entry.minX, pos.x);
      entry.maxX = Math.max(entry.maxX, pos.x);
    }
  }
  // Each band hugs its own works' posters, so a filtered phase shrinks with
  // them rather than reaching to the next one.
  return [...byPhase.entries()]
    .sort(([a], [b]) => a - b)
    .map(([phase, entry]) => ({
      phase,
      saga: sagaOf(phase),
      top: entry.minY - padY,
      height: entry.maxY - entry.minY + 2 * padY,
      left: entry.minX - padX,
      width: entry.maxX - entry.minX + 2 * padX,
      singleColumn: entry.maxX - entry.minX < 1e-6,
      ...PHASE_COLOR,
    }));
}

// One frame per saga around its phase bands, CARD_PAD_PX out; sagas are
// kept apart by an empty row (see `buildSteps`).
export function computeSagaBands(
  layout: GraphLayout,
  phaseBands: ReturnType<typeof computePhaseBands>,
) {
  const { width, height } = canvasSize(layout);
  const padX = (CARD_PAD_PX / width) * 100;
  const padY = (CARD_PAD_PX / height) * 100;
  const bySaga = new Map<Saga, typeof phaseBands>();
  for (const band of phaseBands) {
    if (!bySaga.has(band.saga)) bySaga.set(band.saga, []);
    bySaga.get(band.saga)!.push(band);
  }
  return [...bySaga.entries()].map(([saga, bands]) => {
    const left = Math.min(...bands.map((b) => b.left)) - padX;
    const top = Math.min(...bands.map((b) => b.top)) - padY;
    const right = Math.max(...bands.map((b) => b.left + b.width)) + padX;
    const bottom = Math.max(...bands.map((b) => b.top + b.height)) + padY;
    return { saga, left, top, width: right - left, height: bottom - top };
  });
}

// Behind a timeline: a band per decade, tinted through the rainbow so the
// backdrop reads as time moving down; and, in release order, the months as
// columns and where today falls, between the month's released works and
// those still to come.
export function computeTimelineBackdrop(layout: GraphLayout, today = new Date()) {
  const grid = layout.timeline;
  if (!grid) return null;
  const decades: Array<{ decade: number; top: number; bottom: number }> = [];
  for (const row of grid.rows) {
    const decade = Math.floor(row.year / 10) * 10;
    const last = decades.at(-1);
    if (last?.decade === decade) last.bottom = row.bottom;
    else decades.push({ decade, top: row.top, bottom: row.bottom });
  }

  let todayMark: { x: number; top: number; bottom: number } | null = null;
  const row = grid.rows.find((r) => r.year === today.getFullYear());
  const month = grid.months.find((m) => m.month === today.getMonth());
  if (row && month) {
    const column = (TIMELINE_PX.column / canvasSize(layout).width) * 100;
    const released = [...layout.positions.keys()]
      .map((id) => WORK_BY_ID.get(id)!)
      .filter(
        (w) =>
          timelineYear(w, "release") === row.year &&
          releaseMonth(w) === month.month &&
          !isUpcoming(w, today),
      ).length;
    todayMark = { x: month.left + released * column, top: row.top, bottom: row.bottom };
  }

  return {
    decades: decades.map((band, i) => ({
      ...band,
      key: String(band.decade),
      ...decadeTint(decades.length > 1 ? i / (decades.length - 1) : 1),
    })),
    months: grid.months,
    rows: grid.rows,
    today: todayMark,
  };
}
