import type { WorkNode } from "@/data/works";

import { isWorkVisible, type Grouping } from "./groups";
import { recommendedTimeRank, timelineSortKey, timelineYear, type ViewMode } from "./layout";
import { SAGAS, sagaStartSteps, WORK_BY_ID, type Saga, type WorkGraph } from "./relations";
import { prerequisiteOrder } from "./watch-order";

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
    const order = [...sagaStartSteps(graph)].sort((a, b) => a[1] - b[1]);
    const sagaAt = (step: number): Saga =>
      order.filter(([, start]) => start <= step).at(-1)?.[0] ?? order[0]?.[0] ?? "infinity";
    const bySaga = new Map<Saga, WorkNode[]>();
    for (const work of works) {
      const saga = sagaAt(graph.step.get(work.id)!);
      if (!bySaga.has(saga)) bySaga.set(saga, []);
      bySaga.get(saga)!.push(work);
    }
    // Each saga in watch order, otherwise following the recommended order
    // (MCU first, then the rest in story order).
    const rank = recommendedTimeRank();
    const byRank = (a: string, b: string) => rank.get(a)! - rank.get(b)!;
    return SAGAS.filter((saga) => bySaga.has(saga)).map((saga) => ({
      kind: "saga" as const,
      saga,
      works: prerequisiteOrder(
        bySaga.get(saga)!.map((w) => w.id),
        graph,
        byRank,
      ).map((id) => WORK_BY_ID.get(id)!),
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
