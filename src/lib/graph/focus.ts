import type { WorkEdge } from "@/data/works";

import { groupKeyOf, PHASE_GROUP, type Grouping } from "./groups";
import type { ViewMode } from "./layout";
import type { WorkGraph } from "./relations";

// What the map highlights: a selection and its relatives, else a focused
// phase (its works in the phase band's group), else a focused group card.
// `null` means nothing is highlighted.
export function computeActiveSet({
  selectedId,
  distances,
  focusedPhase,
  focusedGroup,
  grouping,
  graph,
}: {
  selectedId: string | null;
  distances: Map<string, number>;
  focusedPhase: number | undefined;
  focusedGroup: string | undefined;
  grouping: Grouping;
  graph: WorkGraph;
}): Set<string> | null {
  if (selectedId) return new Set([selectedId, ...distances.keys()]);
  if (focusedPhase !== undefined) {
    return new Set(
      graph.works
        .filter(
          (w) =>
            w.phase === focusedPhase && groupKeyOf(w, grouping.by) === PHASE_GROUP[grouping.by],
        )
        .map((w) => w.id),
    );
  }
  if (focusedGroup !== undefined) {
    return new Set(
      graph.works.filter((w) => groupKeyOf(w, grouping.by) === focusedGroup).map((w) => w.id),
    );
  }
  return null;
}

// Edges to draw. Recommended mode is laid out by these dependencies, so it
// shows them all. Release and timeline modes order works by date, where
// long lines across the rows say little; they only show a selection's own
// ties.
export function edgesToDraw(
  mode: ViewMode,
  edges: WorkEdge[],
  selectedId: string | null,
  activeSet: Set<string> | null,
): WorkEdge[] {
  if (mode === "recommended") return edges;
  if (!selectedId || !activeSet) return [];
  return edges.filter((edge) => activeSet.has(edge.from) && activeSet.has(edge.to));
}
