import type { Axis, Point } from "./layout";

function sign(n: number) {
  return n < 0 ? -1 : 1;
}

function isClockwiseTurn(inVec: readonly [number, number], outVec: readonly [number, number]) {
  return outVec[0] === -inVec[1] && outVec[1] === inVec[0];
}

export function elbowPath(
  from: Point,
  to: Point,
  cornerRadius: number,
  stubPercent: number,
  axis: Axis,
) {
  const cross = axis === "y" ? "x" : "y";
  if (to[cross] === from[cross]) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const at = (primary: number, crossVal: number) =>
    axis === "y" ? { x: crossVal, y: primary } : { x: primary, y: crossVal };

  const stub = Math.min(stubPercent, Math.abs(to[axis] - from[axis]) / 2);
  const mid = to[axis] - sign(to[axis] - from[axis]) * stub;

  const d1 = sign(mid - from[axis]);
  const dc = sign(to[cross] - from[cross]);
  const d2 = sign(to[axis] - mid);
  const r = Math.min(
    cornerRadius,
    Math.abs(mid - from[axis]),
    Math.abs(to[axis] - mid),
    Math.abs(to[cross] - from[cross]) / 2,
  );
  if (r <= 0.01) {
    const bend1 = at(mid, from[cross]);
    const bend2 = at(mid, to[cross]);
    return `M ${from.x} ${from.y} L ${bend1.x} ${bend1.y} L ${bend2.x} ${bend2.y} L ${to.x} ${to.y}`;
  }

  const leg1: readonly [number, number] = axis === "y" ? [0, d1] : [d1, 0];
  const turn: readonly [number, number] = axis === "y" ? [dc, 0] : [0, dc];
  const leg2: readonly [number, number] = axis === "y" ? [0, d2] : [d2, 0];
  const sweep1 = isClockwiseTurn(leg1, turn) ? 1 : 0;
  const sweep2 = isClockwiseTurn(turn, leg2) ? 1 : 0;

  const arcStart = at(mid - d1 * r, from[cross]);
  const arcEnd1 = at(mid, from[cross] + dc * r);
  const arcStart2 = at(mid, to[cross] - dc * r);
  const arcEnd2 = at(mid + d2 * r, to[cross]);

  return [
    `M ${from.x} ${from.y}`,
    `L ${arcStart.x} ${arcStart.y}`,
    `A ${r} ${r} 0 0 ${sweep1} ${arcEnd1.x} ${arcEnd1.y}`,
    `L ${arcStart2.x} ${arcStart2.y}`,
    `A ${r} ${r} 0 0 ${sweep2} ${arcEnd2.x} ${arcEnd2.y}`,
    `L ${to.x} ${to.y}`,
  ].join(" ");
}
