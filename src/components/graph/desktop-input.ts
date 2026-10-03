import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import {
  clampPan,
  isZoomGesture,
  wheelPanDelta,
  wheelZoomFactor,
  zoomAround,
  type TransformState,
} from "@/lib/graph/wheel-zoom";

// Clamps a transform so the map can't leave the viewport; content sizes are
// unscaled layout pixels. See `clampPan`.
export function keepInView(ref: ReactZoomPanPinchRef, next: TransformState): TransformState {
  const { wrapperComponent: wrapper, contentComponent: content } = ref.instance;
  if (!wrapper || !content) return next;
  return clampPan(
    next,
    { width: content.offsetWidth, height: content.offsetHeight },
    { width: wrapper.clientWidth, height: wrapper.clientHeight },
  );
}

// Desktop input the library doesn't handle the way we want: scrolling pans
// and pinching (or ctrl/cmd+wheel) zooms around the cursor; see
// wheel-zoom.ts. Also pins the wrapper's native scroll at 0, which focus
// scroll-into-view would otherwise move, skewing every transform.
export function attachDesktopInput(
  ref: ReactZoomPanPinchRef,
  { minScale, maxScale }: { minScale: number; maxScale: number },
) {
  const wrapper = ref.instance.wrapperComponent;
  if (!wrapper) return;
  wrapper.addEventListener("scroll", () => {
    wrapper.scrollTop = 0;
    wrapper.scrollLeft = 0;
  });
  wrapper.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const { positionX, positionY, scale } = ref.instance.state;
      if (!isZoomGesture(event)) {
        const pan = wheelPanDelta(event);
        const next = keepInView(ref, { x: positionX + pan.x, y: positionY + pan.y, scale });
        ref.setTransform(next.x, next.y, scale, 0);
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      const next = keepInView(
        ref,
        zoomAround(
          { x: positionX, y: positionY, scale },
          wheelZoomFactor(event),
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          minScale,
          maxScale,
        ),
      );
      ref.setTransform(next.x, next.y, next.scale, 0);
    },
    { passive: false },
  );
}
