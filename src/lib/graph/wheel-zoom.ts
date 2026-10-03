// Desktop wheel input, map-app style: scrolling pans, pinching zooms.
// Trackpad pinches arrive as ctrl+wheel, and so does ctrl+mouse wheel.
// The library's wheel zoom is additive (the same step at 20% and 150%) and
// rubber-bands past the limits; this scales multiplicatively and stops at
// them. Touch gestures are left to the library.

export function isZoomGesture(event: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return event.ctrlKey || event.metaKey;
}

// Per pixel of deltaY. Pinch deltas are small and continuous (~1.04x per
// event); the cap holds a ctrl+mouse notch (~100px) to ~1.2x.
const PINCH_GAIN = 0.01;
const MAX_ZOOM_DELTA_PX = 20;
const LINE_PX = 16;
const PAGE_PX = 800;

export interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
}

function toPixels(delta: number, deltaMode: number) {
  return delta * (deltaMode === 1 ? LINE_PX : deltaMode === 2 ? PAGE_PX : 1);
}

export function wheelZoomFactor({ deltaY, deltaMode }: WheelInput): number {
  const px = toPixels(deltaY, deltaMode);
  const clamped = Math.max(-MAX_ZOOM_DELTA_PX, Math.min(MAX_ZOOM_DELTA_PX, px));
  return Math.exp(-clamped * PINCH_GAIN);
}

// Screen pixels to move the content by. Shift turns a vertical mouse wheel
// sideways (macOS already does this itself, reporting deltaX).
export function wheelPanDelta({ deltaX, deltaY, deltaMode, shiftKey }: WheelInput) {
  const x = toPixels(deltaX, deltaMode);
  const y = toPixels(deltaY, deltaMode);
  return shiftKey && x === 0 ? { x: -y, y: 0 } : { x: -x, y: -y };
}

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}

// Keeps the content point under `point` (wrapper pixels) fixed on screen.
export function zoomAround(
  state: TransformState,
  factor: number,
  point: { x: number; y: number },
  minScale: number,
  maxScale: number,
): TransformState {
  const scale = Math.max(minScale, Math.min(maxScale, state.scale * factor));
  const ratio = scale / state.scale;
  return {
    x: point.x - (point.x - state.x) * ratio,
    y: point.y - (point.y - state.y) * ratio,
    scale,
  };
}
