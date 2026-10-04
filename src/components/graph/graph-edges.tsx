import * as m from "motion/react-m";
import { useEffect, useState } from "react";

import type { EdgeKind, WorkEdge } from "@/data/works";
import { elbowPath, elbowPieces, mergedPath, type EdgePiece } from "@/lib/graph/edge-path";
import type { Axis, Point } from "@/lib/graph/layout";

// Every kind but "reference" means "watch this first", so they share one
// look; references are drawn dashed since they aren't prerequisites.
export type EdgeStyle = "prerequisite" | "reference";

const STYLE_OF_KIND: Record<EdgeKind, EdgeStyle> = {
  "direct-sequel": "prerequisite",
  "spin-off": "prerequisite",
  "leads-into": "prerequisite",
  crossover: "prerequisite",
  reference: "reference",
};

export const EDGE_STYLE: Record<EdgeStyle, { stroke: string; width: number; dash?: string }> = {
  prerequisite: { stroke: "#d4a017", width: 3.5 },
  reference: { stroke: "#78716c", width: 2.5, dash: "5 5" },
};

const HOVER_DELAY_MS = 250;
const CORNER_RADIUS_PX = 14;

interface Props {
  edges: WorkEdge[];
  positions: Map<string, Point>;
  activeSet: Set<string> | null;
  distances: Map<string, number>;
  visibleIds: Set<string>;
  axis: Axis;
  nodeHalfSizePercent: number;
  stubPercent: number;
  // Canvas size in pixels. Lines are drawn in pixels so corners stay round
  // however the canvas is proportioned.
  canvas: { width: number; height: number };
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
  stubPercent,
  canvas,
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
    pieces: EdgePiece[];
    path: string;
    opacity: number;
    delay: number;
    strokeWidth: number;
    onEnter: () => void;
    onLeave: () => void;
  }> = [];

  const toPx = (p: Point): Point => ({
    x: (p.x / 100) * canvas.width,
    y: (p.y / 100) * canvas.height,
  });
  const stubPx = (stubPercent / 100) * (axis === "y" ? canvas.height : canvas.width);
  const radiusPx = Math.min(CORNER_RADIUS_PX, stubPx);

  // References go first so prerequisite lines are drawn over them.
  const ordered = [...edges].sort(
    (a, b) => Number(b.kind === "reference") - Number(a.kind === "reference"),
  );
  for (const edge of ordered) {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
    const fromCenter = positions.get(edge.from);
    const toCenter = positions.get(edge.to);
    if (!fromCenter || !toCenter) continue;
    const from = toPx(
      axis === "y"
        ? { x: fromCenter.x, y: fromCenter.y + nodeHalfSizePercent }
        : { x: fromCenter.x + nodeHalfSizePercent, y: fromCenter.y },
    );
    const to = toPx(
      axis === "y"
        ? { x: toCenter.x, y: toCenter.y - nodeHalfSizePercent }
        : { x: toCenter.x - nodeHalfSizePercent, y: toCenter.y },
    );
    const key = edgeKey(edge);
    const pieces = elbowPieces(from, to, radiusPx, stubPx, axis);
    const style = STYLE_OF_KIND[edge.kind];
    const isHovered = hoveredEdge === key;
    const isActive = activeSet !== null && activeSet.has(edge.from) && activeSet.has(edge.to);
    const dim = activeSet !== null && !isActive;
    const delay = isActive
      ? Math.max(Math.abs(distances.get(edge.from) ?? 0), Math.abs(distances.get(edge.to) ?? 0)) *
        0.06
      : 0;

    // Two looks only: full, or faded while something else is highlighted.
    const opacity = dim && !isHovered ? 0.05 : 1;

    edgeRenders.push({
      key,
      style,
      pieces,
      path: elbowPath(from, to, radiusPx, stubPx, axis),
      opacity,
      delay: isHovered ? 0 : delay,
      strokeWidth: EDGE_STYLE[style].width * (isHovered ? 1.6 : 1),
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
      className="absolute inset-0 size-full"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
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
            {/* Dashed lines are merged so overlaps keep their gaps. */}
            {(style.dash
              ? [{ key: "merged", path: mergedPath(group.map((render) => render.pieces)) }]
              : group
            ).map((render) => (
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
