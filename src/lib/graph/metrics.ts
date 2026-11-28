// Shared shapes and sizes for the map's layouts and the cards drawn behind
// them.

export type ViewMode = "recommended" | "release" | "chronology";
export type Axis = "x" | "y";

// Percentages (0–100) of the canvas.
export interface Point {
  x: number;
  y: number;
}

export interface GraphLayout {
  positions: Map<string, Point>;
  // The sizes it was laid out with.
  metrics: Metrics;
  totalLanes: number;
  rowCount: number;
  // Recommended order: room above the first row for the saga frames.
  headerPx?: number;
  // Timelines size their own canvas (see TIMELINE_PX) and record their grid.
  size?: { width: number; height: number };
  timeline?: TimelineGrid;
}

// A timeline's grid, in canvas percentages: one row per year that has
// works, and (release order only) the months as columns, January first.
// Month 12 holds works announced only to the year.
export interface TimelineGrid {
  rows: Array<{ year: number; top: number; bottom: number }>;
  months: Array<{ month: number; left: number; right: number }>;
}

// What each work is drawn as on the map: its poster, or its title logo on a
// wide tile. Every size below follows from the node's.
export type NodeArt = "poster" | "logo";

// Every size here is a multiple of 4.
export interface Metrics {
  // The node's size, which cards are padded around.
  node: { width: number; height: number };
  // Every card (phase, saga, franchise or Earth) keeps this much room on all
  // four sides between its edge and what it holds.
  cardPad: number;
  // Cells leave room around each node for the cards' padding. A row is a
  // node plus two paddings plus one more, so cards in neighboring rows
  // (stacked phases, timeline rows) sit `cardPad` apart.
  lane: number;
  row: number;
  // Between neighboring cards' lane runs (a run holding phases also takes
  // room for its nested frames; see computeGitGraphLayout).
  groupGap: number;
  // Between franchises sharing an Earth: keeps a phase band clear of the
  // neighboring franchise's nodes.
  subgroupGap: number;
  // Room above the first saga's frame, and between sagas (see below).
  sagaTop: number;
  sagaBreak: number;
  // The card holding the phases sits this much lower than its neighbors: its
  // sagas and phases add two paddings above its first nodes, so its top edge
  // then lines up with theirs and every card keeps the same padding.
  phaseCardDrop: number;
  // Extra lanes between a saga's last phased lane and the works beside it.
  unphasedClearance: number;
  // Timelines pack nodes closer than the recommended map: no lines run
  // between them. The gutter and header keep the first column and row clear
  // of the year and month labels.
  timeline: { column: number; row: number; gutter: number; header: number; end: number };
}

const CARD_PAD_PX = 28;

function metricsFor(node: { width: number; height: number }): Metrics {
  const lane = node.width + 64;
  const row = node.height + 3 * CARD_PAD_PX;
  // A saga frame reaches two paddings past its nodes (phase, then saga); a
  // row only spares (row - node) / 2 above and below. These make up the
  // difference above the first saga and between sagas, which then sit one
  // card padding apart.
  const sagaReach = node.height / 2 + 2 * CARD_PAD_PX;
  const phaseCardDrop = 2 * CARD_PAD_PX;
  return {
    node,
    cardPad: CARD_PAD_PX,
    lane,
    row,
    groupGap: 44,
    subgroupGap: 32,
    sagaTop: Math.max(0, sagaReach + CARD_PAD_PX - row / 2 - phaseCardDrop),
    sagaBreak: Math.max(0, 2 * sagaReach + CARD_PAD_PX - row),
    phaseCardDrop,
    unphasedClearance: Math.max(0, (node.width + 3 * CARD_PAD_PX - lane) / lane),
    timeline: { column: node.width + 20, row: node.height + 44, gutter: 72, header: 44, end: 24 },
  };
}

export const METRICS: Record<NodeArt, Metrics> = {
  poster: metricsFor({ width: 80, height: 120 }),
  logo: metricsFor({ width: 128, height: 72 }),
};

// A layout position (canvas percentages) in canvas pixels.
export function pointToPx(p: Point, canvas: { width: number; height: number }): Point {
  return { x: (p.x / 100) * canvas.width, y: (p.y / 100) * canvas.height };
}

export function canvasHeight(m: Metrics, rowCount: number, headerPx = 0) {
  return Math.max(500, rowCount * m.row + headerPx);
}

export function canvasSize(layout: GraphLayout) {
  if (layout.size) return layout.size;
  return {
    width: Math.max(500, layout.totalLanes * layout.metrics.lane),
    height: canvasHeight(layout.metrics, layout.rowCount, layout.headerPx),
  };
}
