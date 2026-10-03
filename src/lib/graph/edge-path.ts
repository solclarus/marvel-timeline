import type { Axis, Point } from "./layout";

function sign(n: number) {
  return n < 0 ? -1 : 1;
}

function isClockwiseTurn(inVec: readonly [number, number], outVec: readonly [number, number]) {
  return outVec[0] === -inVec[1] && outVec[1] === inVec[0];
}

// An elbow edge as its straight runs and rounded corners, in drawing order.
export type EdgePiece =
  | { kind: "line"; from: Point; to: Point }
  | { kind: "arc"; from: Point; to: Point; r: number; sweep: 0 | 1 };

export function elbowPieces(
  from: Point,
  to: Point,
  cornerRadius: number,
  stubPercent: number,
  axis: Axis,
): EdgePiece[] {
  const cross = axis === "y" ? "x" : "y";
  if (to[cross] === from[cross]) return [{ kind: "line", from, to }];

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
    return [
      { kind: "line", from, to: bend1 },
      { kind: "line", from: bend1, to: bend2 },
      { kind: "line", from: bend2, to },
    ];
  }

  const leg1: readonly [number, number] = axis === "y" ? [0, d1] : [d1, 0];
  const turn: readonly [number, number] = axis === "y" ? [dc, 0] : [0, dc];
  const leg2: readonly [number, number] = axis === "y" ? [0, d2] : [d2, 0];

  const arcStart = at(mid - d1 * r, from[cross]);
  const arcEnd1 = at(mid, from[cross] + dc * r);
  const arcStart2 = at(mid, to[cross] - dc * r);
  const arcEnd2 = at(mid + d2 * r, to[cross]);

  return [
    { kind: "line", from, to: arcStart },
    { kind: "arc", from: arcStart, to: arcEnd1, r, sweep: isClockwiseTurn(leg1, turn) ? 1 : 0 },
    { kind: "line", from: arcEnd1, to: arcStart2 },
    { kind: "arc", from: arcStart2, to: arcEnd2, r, sweep: isClockwiseTurn(turn, leg2) ? 1 : 0 },
    { kind: "line", from: arcEnd2, to },
  ];
}

function pieceCommand(piece: EdgePiece) {
  return piece.kind === "line"
    ? `L ${piece.to.x} ${piece.to.y}`
    : `A ${piece.r} ${piece.r} 0 0 ${piece.sweep} ${piece.to.x} ${piece.to.y}`;
}

export function elbowPath(
  from: Point,
  to: Point,
  cornerRadius: number,
  stubPercent: number,
  axis: Axis,
) {
  const pieces = elbowPieces(from, to, cornerRadius, stubPercent, axis);
  return [`M ${from.x} ${from.y}`, ...pieces.map(pieceCommand)].join(" ");
}

// Several edges as one path with their shared stretches drawn once. Dashed
// lines that overlap out of step fill each other's gaps and read as solid;
// merging the overlaps keeps one dash pattern per stretch.
export function mergedPath(edges: EdgePiece[][]) {
  const runs = new Map<string, { vertical: boolean; at: number; spans: [number, number][] }>();
  const arcs = new Set<string>();
  for (const piece of edges.flat()) {
    if (piece.kind === "arc") {
      arcs.add(`M ${piece.from.x} ${piece.from.y} ${pieceCommand(piece)}`);
      continue;
    }
    const vertical = piece.from.x === piece.to.x;
    const at = vertical ? piece.from.x : piece.from.y;
    const [a, b] = vertical ? [piece.from.y, piece.to.y] : [piece.from.x, piece.to.x];
    const key = `${vertical ? "v" : "h"}${at.toFixed(2)}`;
    if (!runs.has(key)) runs.set(key, { vertical, at, spans: [] });
    runs.get(key)!.spans.push([Math.min(a, b), Math.max(a, b)]);
  }

  const parts: string[] = [];
  for (const { vertical, at, spans } of runs.values()) {
    spans.sort((p, q) => p[0] - q[0]);
    const merged: [number, number][] = [];
    for (const span of spans) {
      const last = merged.at(-1);
      if (last && span[0] <= last[1] + 0.01) last[1] = Math.max(last[1], span[1]);
      else merged.push([...span]);
    }
    for (const [a, b] of merged) {
      parts.push(vertical ? `M ${at} ${a} L ${at} ${b}` : `M ${a} ${at} L ${b} ${at}`);
    }
  }
  return [...parts, ...arcs].join(" ");
}
