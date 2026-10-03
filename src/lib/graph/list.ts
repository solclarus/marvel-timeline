import type { WorkNode } from "@/data/works";

import { isWorkVisible, type Grouping } from "./groups";
import { recommendedTimeRank, timelineSortKey, timelineYear, type ViewMode } from "./layout";
import { sagaOf, type Saga, type WorkGraph } from "./relations";

export type ListSection =
  | { kind: "saga"; saga: Saga; works: WorkNode[] }
  | { kind: "decade"; decade: number; works: WorkNode[] };

// The map's works as one list, in the view mode's order, split into the
// recommended order's sagas or the timelines' decades.
export function listSections(mode: ViewMode, grouping: Grouping, graph: WorkGraph): ListSection[] {
  const works = graph.works.filter((w) => isWorkVisible(w, grouping));
  if (mode === "recommended") {
    // Each saga runs from its first phased work's row to the next saga's;
    // other franchises fall in by row.
    const starts = new Map<Saga, number>();
    for (const w of graph.works) {
      if (w.phase === undefined) continue;
      const saga = sagaOf(w.phase);
      starts.set(saga, Math.min(starts.get(saga) ?? Infinity, graph.step.get(w.id)!));
    }
    const order = [...starts.entries()].sort((a, b) => a[1] - b[1]);
    const sagaAt = (step: number): Saga =>
      order.filter(([, start]) => start <= step).at(-1)?.[0] ?? order[0]?.[0] ?? "infinity";
    const bySaga = new Map<Saga, WorkNode[]>();
    for (const work of works) {
      const saga = sagaAt(graph.step.get(work.id)!);
      if (!bySaga.has(saga)) bySaga.set(saga, []);
      bySaga.get(saga)!.push(work);
    }
    const rank = recommendedTimeRank();
    return (["infinity", "multiverse", "mutant"] as const)
      .filter((saga) => bySaga.has(saga))
      .map((saga) => ({
        kind: "saga" as const,
        saga,
        works: watchOrder(bySaga.get(saga)!, graph, rank),
      }));
  }

  const sorted = [...works].sort((a, b) =>
    timelineSortKey(a, mode).localeCompare(timelineSortKey(b, mode)),
  );
  const sections: ListSection[] = [];
  for (const work of sorted) {
    const decade = Math.floor(timelineYear(work, mode) / 10) * 10;
    const last = sections.at(-1);
    if (last?.kind === "decade" && last.decade === decade) last.works.push(work);
    else sections.push({ kind: "decade", decade, works: [work] });
  }
  return sections;
}

// Works in an order that keeps each after its prerequisites, otherwise
// following the recommended order (MCU first, then the rest in story order).
function watchOrder(works: WorkNode[], graph: WorkGraph, rank: Map<string, number>): WorkNode[] {
  const ids = new Set(works.map((w) => w.id));
  const pending = new Map(
    works.map((w) => [w.id, (graph.incoming.get(w.id) ?? []).filter((p) => ids.has(p)).length]),
  );
  const byRank = (a: string, b: string) => rank.get(a)! - rank.get(b)!;
  const ordered: WorkNode[] = [];
  let ready = works.filter((w) => pending.get(w.id) === 0).map((w) => w.id);
  while (ready.length > 0) {
    ready.sort(byRank);
    const next = ready.shift()!;
    ordered.push(works.find((w) => w.id === next)!);
    for (const child of graph.outgoing.get(next) ?? []) {
      if (!pending.has(child)) continue;
      const left = pending.get(child)! - 1;
      pending.set(child, left);
      if (left === 0) ready.push(child);
    }
  }
  return ordered;
}
