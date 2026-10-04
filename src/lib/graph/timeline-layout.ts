import type { WorkNode } from "@/data/works";

import { groupKeyOf, isWorkVisible, visibleGroups, type Grouping } from "./groups";
import {
  canvasHeight,
  TIMELINE_HEADER_PX,
  type GraphLayout,
  type Point,
  type ViewMode,
} from "./metrics";
import type { WorkGraph } from "./relations";

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

export function computeTimelineLayout(
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
  const bands = visibleGroups(grouping)
    .map((group) => group.key)
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
