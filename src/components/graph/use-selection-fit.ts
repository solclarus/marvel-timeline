import { useEffect, useRef } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import { pointToPx, type GraphLayout } from "@/lib/graph/layout";
import { getRelatedDistances, type WorkGraph } from "@/lib/graph/relations";
import { fitBox } from "@/lib/graph/wheel-zoom";
import { motionMs } from "@/lib/motion";

const PAD = 24;
const ANIMATION_MS = 450;

// Selecting a work zooms the map so it (with `withRelatives`, it and the
// works just before and after it) fits in the area the detail panel (top)
// and command bar (bottom) leave uncovered. It refits only when `fitKey`
// changes, i.e. when what's shown changes: the map re-renders
// on every zoom step, and refitting on those would undo the viewer's own
// zooming. The first fit (a shared link) jumps; later ones animate.
export function useSelectionFit({
  transformRef,
  fitKey,
  selectedId,
  withRelatives,
  graph,
  layout,
  canvas,
  node,
  scale,
}: {
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  fitKey: string | null;
  selectedId: string | null;
  withRelatives: boolean;
  graph: WorkGraph;
  layout: GraphLayout;
  canvas: { width: number; height: number };
  node: { width: number; height: number };
  scale: Record<"desktop" | "phone", { min: number; max: number }>;
}) {
  const lastFitKeyRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    if (!selectedId) return;
    const ids = withRelatives
      ? [selectedId, ...getRelatedDistances(selectedId, "immediate", graph).keys()]
      : [selectedId];
    const points = ids.map((id) => layout.positions.get(id)).filter((pos) => pos !== undefined);
    if (points.length === 0) return;
    const px = points.map((pos) => pointToPx(pos, canvas));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const box = {
      left: Math.min(...xs) - node.width / 2 - PAD,
      right: Math.max(...xs) + node.width / 2 + PAD,
      top: Math.min(...ys) - node.height / 2 - PAD,
      bottom: Math.max(...ys) + node.height / 2 + PAD,
    };
    // A fit too big to show keeps the selection in sight.
    const selected = layout.positions.get(selectedId);
    const focus = selected && pointToPx(selected, canvas);
    const animationTime = hasFittedRef.current ? motionMs(ANIMATION_MS) : 0;
    hasFittedRef.current = true;

    // Two frames, so the library's ResizeObserver (which cancels in-flight
    // animations on resize) has already fired.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const wrapper = transformRef.current?.instance.wrapperComponent;
        if (!wrapper) return;
        const viewport = { width: wrapper.clientWidth, height: wrapper.clientHeight };
        const phone = viewport.width < 640;
        // Wide screens show the card as a sidebar on the left.
        const sidebar = viewport.width >= 1024;
        const { min, max } = scale[phone ? "phone" : "desktop"];
        const next = fitBox(
          box,
          viewport,
          {
            top: sidebar ? 32 : phone ? 120 : 150,
            bottom: 88,
            left: sidebar ? 544 : 24,
            // The desktop zoom controls sit on the right.
            right: viewport.width >= 768 ? 96 : 24,
          },
          min,
          max,
          focus,
        );
        transformRef.current?.setTransform(next.x, next.y, next.scale, animationTime);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [transformRef, fitKey, selectedId, withRelatives, graph, layout, canvas, node, scale]);
}
