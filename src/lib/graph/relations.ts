import {
  EDGES,
  HARD_EDGE_KINDS,
  MEDIA,
  mediumOf,
  WORKS,
  type Medium,
  type EdgeKind,
  type WorkEdge,
  type WorkNode,
} from "@/data/works";

export type FocusMode = "chain" | "immediate";

// The MCU's sagas, each a run of phases.
export type Saga = "infinity" | "multiverse" | "mutant";
export function sagaOf(phase: number): Saga {
  return phase <= 3 ? "infinity" : phase <= 6 ? "multiverse" : "mutant";
}

// Which kinds of work the map shows: any non-empty mix of films, live-action
// series and animation, in `MEDIA` order.
export type MediaFilter = readonly Medium[];

export const WORK_BY_ID = new Map<string, WorkNode>(WORKS.map((w) => [w.id, w]));

// The dependency graph over a subset of works. Works left out are bridged:
// a film that builds on a series that builds on a film gets an edge from
// that earlier film, so chains survive hiding the series.
export interface WorkGraph {
  works: WorkNode[];
  edges: WorkEdge[];
  // child → parents and parent → children, prerequisite edges only
  // ("reference" excluded).
  incoming: Map<string, string[]>;
  outgoing: Map<string, string[]>;
  // Row in recommended mode: longest path from a root over every edge
  // (references too, so their lines point down like the rest), floored per
  // MCU phase so phases stack as clean bands, with an empty row between
  // sagas for their frames.
  step: Map<string, number>;
  maxStep: number;
}

const weaker = (a: EdgeKind, b: EdgeKind): EdgeKind => (a === "reference" ? a : b);

function bridgeEdges(included: Set<string>): WorkEdge[] {
  const byPair = new Map<string, WorkEdge>();
  const add = (edge: WorkEdge) => {
    const key = `${edge.from}->${edge.to}`;
    // A direct (or stronger) edge wins over a bridged reference one.
    const existing = byPair.get(key);
    if (!existing || (existing.kind === "reference" && edge.kind !== "reference")) {
      byPair.set(key, edge);
    }
  };

  for (const work of WORKS) {
    if (!included.has(work.id)) continue;
    // Walk back through left-out works until reaching included ones.
    const stack = (work.dependsOn ?? []).map((dep) => ({ id: dep.id, kind: dep.kind }));
    const seen = new Set<string>();
    while (stack.length > 0) {
      const { id, kind } = stack.pop()!;
      if (included.has(id)) {
        add({ from: id, to: work.id, kind });
        continue;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      for (const dep of WORK_BY_ID.get(id)?.dependsOn ?? []) {
        stack.push({ id: dep.id, kind: weaker(dep.kind, kind) });
      }
    }
  }
  return [...byPair.values()];
}

function buildAdjacency(
  edges: WorkEdge[],
  direction: "incoming" | "outgoing",
  { withReferences = false } = {},
) {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!withReferences && !HARD_EDGE_KINDS.includes(edge.kind)) continue;
    const [key, value] = direction === "incoming" ? [edge.to, edge.from] : [edge.from, edge.to];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(value);
  }
  return map;
}

function buildSteps(works: WorkNode[], incoming: Map<string, string[]>) {
  const phaseById = new Map(
    works.filter((w) => w.phase !== undefined).map((w) => [w.id, w.phase!]),
  );
  const steps = new Map<string, number>();
  const visiting = new Set<string>();
  const floors = new Map<number, number>();

  function stepOf(id: string): number {
    const cached = steps.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const natural = parents.length === 0 ? 0 : Math.max(...parents.map(stepOf)) + 1;
    const phase = phaseById.get(id);
    const step = phase !== undefined ? Math.max(natural, floorOf(phase)) : natural;
    visiting.delete(id);
    steps.set(id, step);
    return step;
  }

  function floorOf(phase: number): number {
    // Phase 1 starts a row down, leaving room above the first saga's frame.
    if (phase <= 1) return 1;
    const cached = floors.get(phase);
    if (cached !== undefined) return cached;
    const previousPhaseWorks = works.filter((w) => w.phase === phase - 1);
    const sagaGap = sagaOf(phase) === sagaOf(phase - 1) ? 0 : 1;
    const value =
      1 +
      sagaGap +
      (previousPhaseWorks.length > 0
        ? Math.max(...previousPhaseWorks.map((w) => stepOf(w.id)))
        : floorOf(phase - 1) - sagaGap);
    floors.set(phase, value);
    return value;
  }

  for (const work of works) stepOf(work.id);
  return steps;
}

export function buildWorkGraph(include: (work: WorkNode) => boolean): WorkGraph {
  const works = WORKS.filter(include);
  const included = new Set(works.map((w) => w.id));
  const edges = works.length === WORKS.length ? EDGES : bridgeEdges(included);
  const incoming = buildAdjacency(edges, "incoming");
  const outgoing = buildAdjacency(edges, "outgoing");
  const step = buildSteps(works, buildAdjacency(edges, "incoming", { withReferences: true }));
  return {
    works,
    edges,
    incoming,
    outgoing,
    step,
    maxStep: Math.max(0, ...step.values()),
  };
}

export const WORK_GRAPHS = {
  all: buildWorkGraph(() => true),
  movies: buildWorkGraph((work) => mediumOf(work) === "movie"),
};

const graphCache = new Map<string, WorkGraph>([
  [MEDIA.join(","), WORK_GRAPHS.all],
  ["movie", WORK_GRAPHS.movies],
]);

// The graph for a media filter, built once per mix.
export function graphForMedia(media: MediaFilter): WorkGraph {
  const key = media.join(",");
  let graph = graphCache.get(key);
  if (!graph) {
    graph = buildWorkGraph((work) => media.includes(mediumOf(work)));
    graphCache.set(key, graph);
  }
  return graph;
}

// The full graph, for code that doesn't depend on the media filter.
export const INCOMING = WORK_GRAPHS.all.incoming;
export const OUTGOING = WORK_GRAPHS.all.outgoing;
export const GLOBAL_STEP = WORK_GRAPHS.all.step;
export const MAX_STEP = WORK_GRAPHS.all.maxStep;

// Negative for ancestors, positive for descendants.
export function getRelatedDistances(
  id: string,
  mode: FocusMode,
  graph: WorkGraph = WORK_GRAPHS.all,
) {
  const distances = new Map<string, number>();
  const seen = new Set<string>([id]);
  const queue: Array<[string, number, "in" | "out"]> = [];

  for (const parent of graph.incoming.get(id) ?? []) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    distances.set(parent, -1);
    queue.push([parent, 1, "in"]);
  }
  for (const child of graph.outgoing.get(id) ?? []) {
    if (seen.has(child)) continue;
    seen.add(child);
    distances.set(child, 1);
    queue.push([child, 1, "out"]);
  }

  if (mode === "immediate") return distances;

  while (queue.length > 0) {
    const [current, dist, dir] = queue.shift()!;
    const neighbors = dir === "in" ? graph.incoming.get(current) : graph.outgoing.get(current);
    for (const next of neighbors ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      const nextDist = dist + 1;
      distances.set(next, dir === "in" ? -nextDist : nextDist);
      queue.push([next, nextDist, dir]);
    }
  }
  return distances;
}

// Only counts edges drawn in the current view, so a poster never gets a
// connector nub without a line. With a selection, edges outside `activeSet`
// fade out, so they don't count either.
export function computeEdgeVisibility(
  visibleIds: Set<string>,
  activeSet: Set<string> | null = null,
  graph: WorkGraph = WORK_GRAPHS.all,
) {
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  for (const edge of graph.edges) {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
    if (activeSet && (!activeSet.has(edge.from) || !activeSet.has(edge.to))) continue;
    hasOutgoing.add(edge.from);
    hasIncoming.add(edge.to);
  }
  return { hasIncoming, hasOutgoing };
}
