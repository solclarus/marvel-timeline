import { computeGitGraphLayout } from "./git-graph-layout";
import type { Grouping } from "./groups";
import type { GraphLayout, ViewMode } from "./metrics";
import { WORK_GRAPHS, type WorkGraph } from "./relations";
import { computeTimelineLayout } from "./timeline-layout";

export * from "./backdrop";
export { recommendedTimeRank } from "./git-graph-layout";
export { canvasSize, type Axis, type GraphLayout, type Point, type ViewMode } from "./metrics";
export { timelineSortKey, timelineYear } from "./timeline-layout";

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

export function computeEdgeGeometry(
  flowAxisSpan: number,
  flowStepCount: number,
  nodeFlowSize: number,
  headerPx = 0,
) {
  const nodeHalfSizePercent = (nodeFlowSize / 2 / flowAxisSpan) * 100;
  // Rows (or columns) span the canvas apart from any header or saga gaps.
  const flowStepPercent = (100 / flowStepCount) * (1 - headerPx / flowAxisSpan);
  const tightestGapPercent = Math.max(0.1, flowStepPercent - 2 * nodeHalfSizePercent);
  const stubPercent = tightestGapPercent / 2;
  return { nodeHalfSizePercent, stubPercent };
}
