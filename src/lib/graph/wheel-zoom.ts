// Desktop wheel zoom. The library's wheel zoom is additive (the same step at
// 20% and 150%) and rubber-bands past the limits; this scales
// multiplicatively and stops at them. Touch pinch is left to the library.

// Per pixel of deltaY. A mouse notch (~100px) zooms ~1.2x; trackpad pinches
// (sent as ctrl+wheel with small deltas) need more gain per pixel.
const WHEEL_GAIN = 0.0018;
const PINCH_GAIN = 0.01;
// Caps one event so a fast flick or a line/page-mode delta can't jump far.
const MAX_DELTA_PX = 120;

const LINE_PX = 16;
const PAGE_PX = 800;

export interface WheelInput {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

export function wheelZoomFactor({ deltaY, deltaMode, ctrlKey }: WheelInput): number {
  const px = deltaY * (deltaMode === 1 ? LINE_PX : deltaMode === 2 ? PAGE_PX : 1);
  const clamped = Math.max(-MAX_DELTA_PX, Math.min(MAX_DELTA_PX, px));
  return Math.exp(-clamped * (ctrlKey ? PINCH_GAIN : WHEEL_GAIN));
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
