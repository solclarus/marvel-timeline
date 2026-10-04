// The viewer's OS-level "reduce motion" setting, read at call time so it
// follows changes without a reload.
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// An animation duration, or 0 when the viewer asked for less motion.
export function motionMs(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}
