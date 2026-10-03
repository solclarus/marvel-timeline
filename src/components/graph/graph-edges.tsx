import * as m from "motion/react-m";
import { useEffect, useState } from "react";

import type { EdgeKind, WorkEdge } from "@/data/works";
import { elbowPath } from "@/lib/graph/edge-path";
import type { Axis, Point } from "@/lib/graph/layout";

// Three looks for five kinds: a series' own sequels, ties to other series
// (spin-offs, lead-ins, crossovers), and loose references.
type EdgeStyle = "sequel" | "tie" | "reference";

const STYLE_OF_KIND: Record<EdgeKind, EdgeStyle> = {
  "direct-sequel": "sequel",
  "spin-off": "tie",
  "leads-into": "tie",
  crossover: "tie",
  reference: "reference",
};

export const EDGE_STYLE: Record<EdgeStyle, { stroke: string; width: number; dash?: string }> = {
  sequel: { stroke: "#334155", width: 4.5 },
  tie: { stroke: "#ca8a04", width: 3 },
  reference: { stroke: "#a8a29e", width: 2.5, dash: "5 5" },
};

const HOVER_DELAY_MS = 250;

interface Props {
  edges: WorkEdge[];
  positions: Map<string, Point>;
  activeSet: Set<string> | null;
  distances: Map<string, number>;
  visibleIds: Set<string>;
  axis: Axis;
  nodeHalfSizePercent: number;
  cornerRadius: number;
  stubPercent: number;
}

function edgeKey(edge: { from: string; to: string }) {
  return `${edge.from}-${edge.to}`;
}

export function GraphEdges({
  edges,
  positions,
  activeSet,
  distances,
  visibleIds,
  axis,
  nodeHalfSizePercent,
  cornerRadius,
  stubPercent,
}: Props) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  // Only a resting pointer counts, so panning across lines doesn't flicker.
  const [pendingEdge, setPendingEdge] = useState<string | null>(null);
  useEffect(() => {
    if (pendingEdge === null) return;
    const timer = window.setTimeout(() => setHoveredEdge(pendingEdge), HOVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pendingEdge]);

  // Overlapping same-style edges share one group opacity; per-path opacity
  // would composite overlaps into a darker line.
  const edgeRenders: Array<{
    key: string;
    style: EdgeStyle;
    path: string;
    opacity: number;
    delay: number;
    strokeWidth: number;
    onEnter: () => void;
    onLeave: () => void;
  }> = [];

  for (const edge of edges) {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
    const fromCenter = positions.get(edge.from);
    const toCenter = positions.get(edge.to);
    if (!fromCenter || !toCenter) continue;
    const from =
      axis === "y"
        ? { x: fromCenter.x, y: fromCenter.y + nodeHalfSizePercent }
        : { x: fromCenter.x + nodeHalfSizePercent, y: fromCenter.y };
    const to =
      axis === "y"
        ? { x: toCenter.x, y: toCenter.y - nodeHalfSizePercent }
        : { x: toCenter.x - nodeHalfSizePercent, y: toCenter.y };

    const key = edgeKey(edge);
    const isHovered = hoveredEdge === key;
    const isActive = activeSet !== null && activeSet.has(edge.from) && activeSet.has(edge.to);
    const dim = activeSet !== null && !isActive;
    const delay = isActive
      ? Math.max(Math.abs(distances.get(edge.from) ?? 0), Math.abs(distances.get(edge.to) ?? 0)) *
        0.06
      : 0;

    const baseOpacity = edge.kind === "reference" ? 0.22 : 0.55;
    // Hover lifts just the one line; the rest of the map stays put.
    const opacity = isHovered ? 1 : dim ? 0.05 : isActive ? 1 : baseOpacity;

    edgeRenders.push({
      key,
      style: STYLE_OF_KIND[edge.kind],
      path: elbowPath(from, to, cornerRadius, stubPercent, axis),
      opacity,
      delay: isHovered ? 0 : delay,
      strokeWidth: EDGE_STYLE[STYLE_OF_KIND[edge.kind]].width * (isHovered ? 1.6 : 1),
      onEnter: () => setPendingEdge(key),
      onLeave: () => {
        setPendingEdge((current) => (current === key ? null : current));
        setHoveredEdge((current) => (current === key ? null : current));
      },
    });
  }

  const groups = new Map<string, typeof edgeRenders>();
  for (const render of edgeRenders) {
    const groupKey = `${render.style}:${render.opacity}:${render.delay}:${render.strokeWidth}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(render);
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {[...groups.entries()].map(([groupKey, group]) => {
        const { opacity, delay, strokeWidth } = group[0];
        const style = EDGE_STYLE[group[0].style];
        return (
          <m.g
            key={groupKey}
            initial={false}
            animate={{ opacity }}
            transition={{ duration: 0.2, delay }}
          >
            {group.map((render) => (
              <path
                key={render.key}
                d={render.path}
                fill="none"
                stroke={style.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ))}
          </m.g>
        );
      })}
      {/* Wide invisible hit areas; the visible strokes are too thin to hover. */}
      {edgeRenders.map((render) => (
        <path
          key={render.key}
          d={render.path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          vectorEffect="non-scaling-stroke"
          onMouseEnter={render.onEnter}
          onMouseLeave={render.onLeave}
        />
      ))}
    </svg>
  );
}
