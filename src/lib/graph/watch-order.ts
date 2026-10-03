import type { Route } from "@/data/routes";
import type { WorkNode } from "@/data/works";

import { WORK_BY_ID, type WorkGraph } from "./relations";

export interface WatchStep {
  work: WorkNode;
  // A prerequisite of the work itself, not only of another prerequisite.
  direct: boolean;
}

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
  const pending = new Map(
    [...ancestors].map((a) => [
      a,
      (graph.incoming.get(a) ?? []).filter((parent) => ancestors.has(parent)).length,
    ]),
  );
  const byRelease = (a: string, b: string) =>
    WORK_BY_ID.get(a)!.releaseDate.localeCompare(WORK_BY_ID.get(b)!.releaseDate);

  const ordered: WatchStep[] = [];
  let ready = [...pending].filter(([, count]) => count === 0).map(([a]) => a);
  while (ready.length > 0) {
    ready.sort(byRelease);
    const next = ready.shift()!;
    ordered.push({ work: WORK_BY_ID.get(next)!, direct: direct.has(next) });
    for (const child of graph.outgoing.get(next) ?? []) {
      if (!pending.has(child)) continue;
      const left = pending.get(child)! - 1;
      pending.set(child, left);
      if (left === 0) ready.push(child);
    }
  }
  return ordered;
}

// Every work in one watch order: prerequisites first, then by release, so
// any subset taken in this order respects chains through works left out.
function fullWatchOrder(graph: WorkGraph): Map<string, number> {
  const pending = new Map(graph.works.map((w) => [w.id, graph.incoming.get(w.id)?.length ?? 0]));
  const byRelease = (a: string, b: string) =>
    WORK_BY_ID.get(a)!.releaseDate.localeCompare(WORK_BY_ID.get(b)!.releaseDate);
  const rank = new Map<string, number>();
  let ready = [...pending].filter(([, count]) => count === 0).map(([id]) => id);
  while (ready.length > 0) {
    ready.sort(byRelease);
    const next = ready.shift()!;
    rank.set(next, rank.size);
    for (const child of graph.outgoing.get(next) ?? []) {
      if (!pending.has(child)) continue;
      const left = pending.get(child)! - 1;
      pending.set(child, left);
      if (left === 0) ready.push(child);
    }
  }
  return rank;
}

// A route's works, in watch order.
export function routeWorks(route: Route, graph: WorkGraph): WorkNode[] {
  const ids = route.goal
    ? [...(graph.incoming.get(route.goal) ?? []), route.goal]
    : (route.works ?? []);
  const rank = fullWatchOrder(graph);
  return ids
    .filter((id) => rank.has(id))
    .sort((a, b) => rank.get(a)! - rank.get(b)!)
    .map((id) => WORK_BY_ID.get(id)!);
}
