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
  totalLanes: number;
  rowCount: number;
  // Timelines: a strip above the rows, in pixels, for the decade labels and
  // year numbers, so they never sit on the first row's group labels.
  headerPx?: number;
  // Timelines: each decade's horizontal extent, in canvas percentages.
  decadeSpans?: Map<number, { left: number; right: number }>;
}

// Cells leave room around each poster for the cards' padding. A row is a
// poster plus two paddings plus one more, so cards in neighboring rows
// (stacked phases, timeline rows) sit CARD_PAD_PX apart.
export const LANE_PX = 144;
export const ROW_PX = 222;
// The poster's size (see graph-node.tsx), which cards are padded around.
export const POSTER_PX = { width: 68, height: 102 };
// Every card (phase, saga, franchise or Earth) keeps this much room on all
// four sides between its edge and what it holds.
export const CARD_PAD_PX = 40;
// Between neighboring cards' lane runs (a run holding phases also takes room
// for its nested frames; see computeGitGraphLayout).
export const GROUP_GAP_PX = 44;
// Between franchises sharing an Earth: keeps a phase band clear of the
// neighboring franchise's posters.
export const SUBGROUP_GAP_PX = 32;

// A saga frame reaches two paddings past its posters (phase, then saga); a
// row only spares (ROW_PX - poster) / 2 above and below. These make up the
// difference above the first saga and between sagas, which then sit one
// card padding apart.
const SAGA_REACH_PX = POSTER_PX.height / 2 + 2 * CARD_PAD_PX;
// The card holding the phases sits this much lower than its neighbors: its
// sagas and phases add two paddings above its first posters, so its top
// edge then lines up with theirs and every card keeps the same padding.
export const PHASE_CARD_DROP_PX = 2 * CARD_PAD_PX;
export const SAGA_TOP_PX = Math.max(
  0,
  SAGA_REACH_PX + CARD_PAD_PX - ROW_PX / 2 - PHASE_CARD_DROP_PX,
);
export const SAGA_BREAK_PX = Math.max(0, 2 * SAGA_REACH_PX + CARD_PAD_PX - ROW_PX);

// Extra lanes between a saga's last phased lane and the works beside it.
export const UNPHASED_CLEARANCE = Math.max(
  0,
  (POSTER_PX.width + 3 * CARD_PAD_PX - LANE_PX) / LANE_PX,
);

export const TIMELINE_HEADER_PX = 48;

export function canvasHeight(rowCount: number, headerPx = 0) {
  return Math.max(500, rowCount * ROW_PX + headerPx);
}

export function canvasSize(layout: GraphLayout) {
  return {
    width: Math.max(500, layout.totalLanes * LANE_PX),
    height: canvasHeight(layout.rowCount, layout.headerPx),
  };
}
