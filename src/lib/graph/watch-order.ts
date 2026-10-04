import type { Route } from "@/data/routes";
import type { WorkNode } from "@/data/works";

import { WORK_BY_ID, type WorkGraph } from "./relations";

export interface WatchStep {
  work: WorkNode;
  // A prerequisite of the work itself, not only of another prerequisite.
  direct: boolean;
}

// `ids` in an order that puts every work after its prerequisites among
// them; of the works ready at once, `compare` picks which comes first.
export function prerequisiteOrder(
  ids: Iterable<string>,
  graph: WorkGraph,
  compare: (a: string, b: string) => number,
): string[] {
  const subset = new Set(ids);
  const pending = new Map(
    [...subset].map((id) => [
      id,
      (graph.incoming.get(id) ?? []).filter((parent) => subset.has(parent)).length,
    ]),
  );
  const ordered: string[] = [];
  const ready = [...pending].filter(([, count]) => count === 0).map(([id]) => id);
  while (ready.length > 0) {
    ready.sort(compare);
    const next = ready.shift()!;
    ordered.push(next);
    for (const child of graph.outgoing.get(next) ?? []) {
      if (!pending.has(child)) continue;
      const left = pending.get(child)! - 1;
      pending.set(child, left);
      if (left === 0) ready.push(child);
    }
  }
  return ordered;
}

const byRelease = (a: string, b: string) =>
  WORK_BY_ID.get(a)!.releaseDate.localeCompare(WORK_BY_ID.get(b)!.releaseDate);

// Everything to watch before `id`, in an order that always puts a work after
// its own prerequisites; among works ready at the same time, the earlier
// release comes first. Follows prerequisite edges only ("reference" isn't
// one), so it matches the "All related" highlight's ancestors.
export function watchFirst(id: string, graph: WorkGraph): WatchStep[] {
  const ancestors = new Set<string>();
  const stack = [...(graph.incoming.get(id) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (ancestors.has(current)) continue;
    ancestors.add(current);
    stack.push(...(graph.incoming.get(current) ?? []));
  }
  const direct = new Set(graph.incoming.get(id) ?? []);
  return prerequisiteOrder(ancestors, graph, byRelease).map((ancestor) => ({
    work: WORK_BY_ID.get(ancestor)!,
    direct: direct.has(ancestor),
  }));
}

// A route's works, in watch order. Ordering the whole graph first keeps
// chains through works the route leaves out.
export function routeWorks(route: Route, graph: WorkGraph): WorkNode[] {
  const ids = route.goal
    ? [...(graph.incoming.get(route.goal) ?? []), route.goal]
    : (route.works ?? []);
  const rank = new Map(
    prerequisiteOrder(
      graph.works.map((w) => w.id),
      graph,
      byRelease,
    ).map((id, i) => [id, i]),
  );
  return ids
    .filter((id) => rank.has(id))
    .sort((a, b) => rank.get(a)! - rank.get(b)!)
    .map((id) => WORK_BY_ID.get(id)!);
}
