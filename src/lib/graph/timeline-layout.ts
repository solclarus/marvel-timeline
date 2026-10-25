import type { WorkNode } from "@/data/works";

import { isWorkVisible, type Grouping } from "./groups";
import { TIMELINE_PX, type GraphLayout, type Point, type ViewMode } from "./metrics";
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

// The release calendar's column for a work: its month (0–11), or 12 when
// only the year is announced.
export function releaseMonth(work: WorkNode): number {
  return work.releasePrecision === "year" ? 12 : Number(work.releaseDate.slice(5, 7)) - 1;
}

// Timelines read top to bottom, a row per year that has works. Release
// order is a calendar: months line up down the rows, each as wide as its
// busiest year needs, so works keep their place in the year without months
// of empty space. In-story dates are known only to the year, so the
// chronology just lines each year's works up in story order.
export function computeTimelineLayout(
  mode: Exclude<ViewMode, "recommended">,
  grouping: Grouping,
  graph: WorkGraph,
): GraphLayout {
  const works = graph.works
    .filter((w) => isWorkVisible(w, grouping))
    .sort((a, b) => timelineSortKey(a, mode).localeCompare(timelineSortKey(b, mode)));
  const years = [...new Set(works.map((w) => timelineYear(w, mode)))].sort((a, b) => a - b);
  const columnOf = mode === "release" ? releaseMonth : () => 0;

  // Works per year and column, in timeline order.
  const cells = new Map<string, WorkNode[]>();
  for (const work of works) {
    const key = `${timelineYear(work, mode)}|${columnOf(work)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(work);
  }
  const widest = (column: number) =>
    Math.max(0, ...years.map((year) => cells.get(`${year}|${column}`)?.length ?? 0));
  // Every month keeps a column, so the calendar reads as one even when a
  // filter empties a month; the year-only column shows only when used.
  const spans =
    mode === "release"
      ? [...Array.from({ length: 12 }, (_, month) => month), ...(widest(12) > 0 ? [12] : [])].map(
          (month) => ({ month, columns: Math.max(1, widest(month)) }),
        )
      : [{ month: 0, columns: Math.max(1, widest(0)) }];
  const columns = spans.reduce((sum, span) => sum + span.columns, 0);

  const width = TIMELINE_PX.gutter + columns * TIMELINE_PX.column + TIMELINE_PX.end;
  const height = TIMELINE_PX.header + Math.max(1, years.length) * TIMELINE_PX.row + TIMELINE_PX.end;
  const xAt = (px: number) => (px / width) * 100;
  const yAt = (px: number) => (px / height) * 100;

  const firstColumn = new Map<number, number>();
  let column = 0;
  for (const span of spans) {
    firstColumn.set(span.month, column);
    column += span.columns;
  }

  const positions = new Map<string, Point>();
  years.forEach((year, row) => {
    for (const span of spans) {
      cells.get(`${year}|${span.month}`)?.forEach((work, i) => {
        positions.set(work.id, {
          x: xAt(
            TIMELINE_PX.gutter + (firstColumn.get(span.month)! + i + 0.5) * TIMELINE_PX.column,
          ),
          y: yAt(TIMELINE_PX.header + (row + 0.5) * TIMELINE_PX.row),
        });
      });
    }
  });

  return {
    positions,
    totalLanes: columns,
    rowCount: years.length,
    size: { width, height },
    timeline: {
      rows: years.map((year, row) => ({
        year,
        top: yAt(TIMELINE_PX.header + row * TIMELINE_PX.row),
        bottom: yAt(TIMELINE_PX.header + (row + 1) * TIMELINE_PX.row),
      })),
      months:
        mode === "release"
          ? spans.map((span) => ({
              month: span.month,
              left: xAt(TIMELINE_PX.gutter + firstColumn.get(span.month)! * TIMELINE_PX.column),
              right: xAt(
                TIMELINE_PX.gutter +
                  (firstColumn.get(span.month)! + span.columns) * TIMELINE_PX.column,
              ),
            }))
          : [],
    },
  };
}
