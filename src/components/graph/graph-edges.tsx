import * as m from "motion/react-m";
import { useState } from "react";

import { EDGES, type EdgeKind } from "@/data/works";
import { elbowPath } from "@/lib/graph/edge-path";
import type { Axis, Point } from "@/lib/graph/layout";

export const KIND_STYLE: Record<EdgeKind, { stroke: string; width: number; dash?: string }> = {
  "direct-sequel": { stroke: "#334155", width: 4.5 },
  "spin-off": { stroke: "#2563eb", width: 4.5 },
  "leads-into": { stroke: "#ca8a04", width: 4.5 },
  crossover: { stroke: "#dc2626", width: 6.2 },
  reference: { stroke: "#7c3aed", width: 3.5, dash: "5 5" },
};

interface Props {
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

  // Overlapping same-kind edges share one group opacity; per-path opacity
  // would composite overlaps into a darker line.
  const edgeRenders: Array<{
    key: string;
    kind: EdgeKind;
    path: string;
    opacity: number;
    delay: number;
    strokeWidth: number;
    onEnter: () => void;
    onLeave: () => void;
  }> = [];

  for (const edge of EDGES) {
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
    const someHovered = hoveredEdge !== null;
    const isActive = activeSet !== null && activeSet.has(edge.from) && activeSet.has(edge.to);
    const dim = activeSet !== null && !isActive;
    const delay = isActive
      ? Math.max(Math.abs(distances.get(edge.from) ?? 0), Math.abs(distances.get(edge.to) ?? 0)) *
        0.06
      : 0;

    const baseOpacity = edge.kind === "reference" ? 0.22 : 0.55;
    const opacity = someHovered ? (isHovered ? 1 : 0.06) : dim ? 0.05 : isActive ? 1 : baseOpacity;

    edgeRenders.push({
      key,
      kind: edge.kind,
      path: elbowPath(from, to, cornerRadius, stubPercent, axis),
      opacity,
      delay: someHovered ? 0 : delay,
      strokeWidth: isHovered ? KIND_STYLE[edge.kind].width * 1.6 : KIND_STYLE[edge.kind].width,
      onEnter: () => setHoveredEdge(key),
      onLeave: () => setHoveredEdge((current) => (current === key ? null : current)),
    });
  }

  const groups = new Map<string, typeof edgeRenders>();
  for (const render of edgeRenders) {
    const groupKey = `${render.kind}:${render.opacity}:${render.delay}:${render.strokeWidth}`;
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
        const { kind, opacity, delay, strokeWidth } = group[0];
        const style = KIND_STYLE[kind];
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
