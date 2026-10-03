import { useEffect, useRef } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import type { GraphLayout } from "@/lib/graph/layout";
import { getRelatedDistances, type FocusMode, type WorkGraph } from "@/lib/graph/relations";
import { fitBox } from "@/lib/graph/wheel-zoom";

const PAD = 24;
const ANIMATION_MS = 450;

// Selecting a work zooms the map so it and its relatives fit in the area the
// detail panel (top) and command bar (bottom) leave uncovered. It refits only
// when `fitKey` changes, i.e. when what's shown changes: the map re-renders
// on every zoom step, and refitting on those would undo the viewer's own
// zooming. The first fit (a shared link) jumps; later ones animate.
export function useSelectionFit({
  transformRef,
  fitKey,
  selectedId,
  focusMode,
  graph,
  layout,
  canvas,
  node,
  scale,
}: {
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  fitKey: string | null;
  selectedId: string | null;
  focusMode: FocusMode;
  graph: WorkGraph;
  layout: GraphLayout;
  canvas: { width: number; height: number };
  node: { width: number; height: number };
  scale: { min: number; max: number };
}) {
  const lastFitKeyRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    if (!selectedId) return;
    const ids = [selectedId, ...getRelatedDistances(selectedId, focusMode, graph).keys()];
    const points = ids.map((id) => layout.positions.get(id)).filter((pos) => pos !== undefined);
    if (points.length === 0) return;
    const xs = points.map((pos) => (pos.x / 100) * canvas.width);
    const ys = points.map((pos) => (pos.y / 100) * canvas.height);
    const box = {
      left: Math.min(...xs) - node.width / 2 - PAD,
      right: Math.max(...xs) + node.width / 2 + PAD,
      top: Math.min(...ys) - node.height / 2 - PAD,
      bottom: Math.max(...ys) + node.height / 2 + PAD,
    };
    const animationTime = hasFittedRef.current ? ANIMATION_MS : 0;
    hasFittedRef.current = true;

    // Two frames, so the library's ResizeObserver (which cancels in-flight
    // animations on resize) has already fired.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const wrapper = transformRef.current?.instance.wrapperComponent;
        if (!wrapper) return;
        const viewport = { width: wrapper.clientWidth, height: wrapper.clientHeight };
        const phone = viewport.width < 640;
        const next = fitBox(
          box,
          viewport,
          {
            top: phone ? 120 : 150,
            bottom: 88,
            left: 24,
            // The desktop zoom controls sit on the right.
            right: viewport.width >= 768 ? 96 : 24,
          },
          scale.min,
          scale.max,
        );
        transformRef.current?.setTransform(next.x, next.y, next.scale, animationTime);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [transformRef, fitKey, selectedId, focusMode, graph, layout, canvas, node, scale]);
}
