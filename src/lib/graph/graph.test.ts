import { describe, expect, it } from "vitest";

import { EARTH_META, earthsOf, EDGES, mediumOf, WORKS } from "@/data/works";

import { elbowPath, elbowPieces, mergedPath } from "./edge-path";
import { computeActiveSet, edgesToDraw } from "./focus";
import { GROUPS, groupKeyOf, isWorkVisible, PHASE_GROUP, regroup, type Grouping } from "./groups";
import {
  computeEraBands,
  computeLayout,
  computePhaseBands,
  computeYearMarks,
  timelineYear,
  type ViewMode,
} from "./layout";
import {
  computeEdgeVisibility,
  GLOBAL_STEP,
  getRelatedDistances,
  INCOMING,
  graphForMedia,
  WORK_GRAPHS,
} from "./relations";
import {
  clampPan,
  fitBox,
  isZoomGesture,
  wheelPanDelta,
  wheelZoomFactor,
  zoomAround,
} from "./wheel-zoom";

const ALL: Grouping[] = (["franchise", "earth"] as const).map((by) => ({
  by,
  visible: new Set(GROUPS[by].map((group) => group.key)),
}));
const MODES: ViewMode[] = ["recommended", "release", "chronology"];

describe("works data", () => {
  it("has unique ids", () => {
    expect(new Set(WORKS.map((w) => w.id)).size).toBe(WORKS.length);
  });

  it("has an ISO release date and a poster path for every work", () => {
    const invalid = WORKS.filter(
      (w) => !/^\d{4}-\d{2}-\d{2}$/.test(w.releaseDate) || !/^\/\w+\.jpg$/.test(w.poster),
    ).map((w) => w.id);
    expect(invalid).toEqual([]);
  });

  it("gives every work a distinct title in each language", () => {
    // Search resolves a picked result by its title.
    for (const key of ["title", "titleJa"] as const) {
      const titles = WORKS.map((w) => w[key]);
      expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([]);
    }
  });

  it("lists each work's Earths without duplicates", () => {
    const invalid = WORKS.filter((w) => {
      const earths = earthsOf(w);
      return (
        earths.length === 0 ||
        new Set(earths).size !== earths.length ||
        earths.some((earth) => !(earth in EARTH_META))
      );
    }).map((w) => w.id);
    expect(invalid).toEqual([]);
  });

  it("only depends on works that exist", () => {
    const ids = new Set(WORKS.map((w) => w.id));
    const dangling = EDGES.filter((edge) => !ids.has(edge.from));
    expect(dangling).toEqual([]);
  });
});

describe("GLOBAL_STEP", () => {
  it("places every work below all of its prerequisites", () => {
    for (const [child, parents] of INCOMING) {
      for (const parent of parents) {
        expect(GLOBAL_STEP.get(child)!).toBeGreaterThan(GLOBAL_STEP.get(parent)!);
      }
    }
  });

  it("stacks MCU phases as non-overlapping bands", () => {
    const phases = [...new Set(WORKS.map((w) => w.phase).filter((p) => p !== undefined))];
    for (const phase of phases) {
      const previous = WORKS.filter((w) => w.phase === phase - 1);
      if (previous.length === 0) continue;
      const floor = Math.max(...previous.map((w) => GLOBAL_STEP.get(w.id)!));
      const intruders = WORKS.filter((w) => w.phase === phase && GLOBAL_STEP.get(w.id)! <= floor);
      expect(intruders.map((w) => w.id)).toEqual([]);
    }
  });
});

describe("getRelatedDistances", () => {
  it("signs ancestors negative and descendants positive", () => {
    const distances = getRelatedDistances("avengers-endgame", "immediate");
    expect(distances.get("avengers-infinity-war")).toBe(-1);
    expect(distances.get("captain-marvel")).toBe(-1);
    expect(distances.get("black-widow")).toBe(1);
    expect([...distances.values()].every((d) => Math.abs(d) === 1)).toBe(true);
  });

  it("follows the whole chain in chain mode, never crossing direction", () => {
    const distances = getRelatedDistances("avengers-endgame", "chain");
    expect(distances.get("iron-man")).toBeLessThan(-1);
    expect(distances.has("avengers-endgame")).toBe(false);
    const selectedStep = GLOBAL_STEP.get("avengers-endgame")!;
    const misplaced = [...distances].filter(([id, d]) =>
      d < 0 ? GLOBAL_STEP.get(id)! >= selectedStep : GLOBAL_STEP.get(id)! <= selectedStep,
    );
    expect(misplaced).toEqual([]);
  });
});

describe("computeLayout", () => {
  for (const grouping of ALL) {
    for (const mode of MODES) {
      it(`gives every work its own in-bounds cell (${mode}, by ${grouping.by})`, () => {
        const { positions } = computeLayout(mode, grouping);
        expect(positions.size).toBe(WORKS.length);
        const outOfBounds = [...positions]
          .filter(([, { x, y }]) => x < 0 || x > 100 || y < 0 || y > 100)
          .map(([id]) => id);
        expect(outOfBounds).toEqual([]);
        const cells = [...positions.values()].map(({ x, y }) => `${x.toFixed(4)},${y.toFixed(4)}`);
        expect(new Set(cells).size).toBe(cells.length);
      });
    }
  }

  it("only lays out works from visible groups", () => {
    const byFranchise = computeLayout("recommended", {
      by: "franchise",
      visible: new Set(["mcu"]),
    });
    for (const id of byFranchise.positions.keys()) {
      expect(WORKS.find((w) => w.id === id)!.franchise).toBe("mcu");
    }
    const byEarth = computeLayout("release", { by: "earth", visible: new Set(["120703"]) });
    expect([...byEarth.positions.keys()].sort()).toEqual([
      "amazing-spider-man",
      "amazing-spider-man-2",
    ]);
  });
});

describe("elbowPath", () => {
  it("draws a straight line between aligned points", () => {
    expect(elbowPath({ x: 10, y: 0 }, { x: 10, y: 50 }, 1, 5, "y")).toBe("M 10 0 L 10 50");
  });

  it("bends with two arcs between offset points", () => {
    const path = elbowPath({ x: 10, y: 0 }, { x: 30, y: 50 }, 1, 5, "y");
    expect(path.match(/A /g)).toHaveLength(2);
    expect(path.startsWith("M 10 0")).toBe(true);
    expect(path.endsWith("L 30 50")).toBe(true);
  });
});

describe("wheel input", () => {
  const wheel = (deltaY: number, extra: Partial<Parameters<typeof wheelPanDelta>[0]> = {}) => ({
    deltaX: 0,
    deltaY,
    deltaMode: 0,
    shiftKey: false,
    ...extra,
  });

  it("zooms only for pinch and modifier gestures", () => {
    expect(isZoomGesture({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isZoomGesture({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isZoomGesture({ ctrlKey: false, metaKey: false })).toBe(false);
  });

  it("pans opposite to the scroll delta, sideways with shift", () => {
    expect(wheelPanDelta(wheel(100))).toEqual({ x: -0, y: -100 });
    expect(wheelPanDelta(wheel(0, { deltaX: 40 }))).toEqual({ x: -40, y: -0 });
    expect(wheelPanDelta(wheel(100, { shiftKey: true }))).toEqual({ x: -100, y: 0 });
    expect(wheelPanDelta(wheel(3, { deltaMode: 1 })).y).toBe(-48);
  });

  it("zooms by the same ratio at any scale", () => {
    const step = wheelZoomFactor(wheel(-4));
    const a = zoomAround({ x: 0, y: 0, scale: 0.3 }, step, { x: 0, y: 0 }, 0.2, 1.5);
    const b = zoomAround({ x: 0, y: 0, scale: 0.6 }, step, { x: 0, y: 0 }, 0.2, 1.5);
    expect(a.scale / 0.3).toBeCloseTo(b.scale / 0.6);
  });

  it("undoes a pinch step with the opposite step", () => {
    expect(wheelZoomFactor(wheel(-4)) * wheelZoomFactor(wheel(4))).toBeCloseTo(1);
  });

  it("caps a ctrl+mouse notch and oversized deltas", () => {
    expect(wheelZoomFactor(wheel(-100))).toBeLessThan(1.25);
    expect(wheelZoomFactor(wheel(-3, { deltaMode: 1 }))).toBeLessThan(1.25);
    expect(wheelZoomFactor(wheel(-5000))).toBeLessThan(1.25);
  });

  it("keeps the point under the cursor fixed and clamps the scale", () => {
    const state = { x: -200, y: -100, scale: 0.6 };
    const point = { x: 400, y: 300 };
    const next = zoomAround(state, 1.2, point, 0.2, 1.5);
    const before = { x: (point.x - state.x) / state.scale, y: (point.y - state.y) / state.scale };
    const after = { x: (point.x - next.x) / next.scale, y: (point.y - next.y) / next.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAround(state, 100, point, 0.2, 1.5).scale).toBe(1.5);
    expect(zoomAround(state, 0.001, point, 0.2, 1.5).scale).toBe(0.2);
  });
});

describe("groups", () => {
  it("never lists an empty group", () => {
    for (const by of ["franchise", "earth"] as const) {
      const empty = GROUPS[by]
        .filter((group) => !WORKS.some((w) => groupKeyOf(w, by) === group.key))
        .map((group) => group.key);
      expect(empty).toEqual([]);
    }
  });
});

describe("regroup", () => {
  it("keeps the same works on screen when switching to Earths", () => {
    const byFranchise: Grouping = { by: "franchise", visible: new Set(["mcu"]) };
    const byEarth = regroup(byFranchise, "earth", WORKS);
    const before = WORKS.filter((w) => isWorkVisible(w, byFranchise)).map((w) => w.id);
    const after = WORKS.filter((w) => isWorkVisible(w, byEarth)).map((w) => w.id);
    expect(after).toEqual(expect.arrayContaining(before));
    expect(byEarth.visible.has("616")).toBe(true);
    expect(byEarth.visible.has("828")).toBe(true);
  });
});

describe("clampPan", () => {
  const content = { width: 2000, height: 1000 };
  const viewport = { width: 800, height: 600 };

  it("leaves an in-range position alone", () => {
    const state = { x: -300, y: -100, scale: 0.5 };
    expect(clampPan(state, content, viewport)).toEqual(state);
  });

  it("stops each edge at the viewport's center", () => {
    expect(clampPan({ x: 5000, y: 5000, scale: 0.5 }, content, viewport)).toEqual({
      x: 400,
      y: 300,
      scale: 0.5,
    });
    // Right/bottom edges: x + 2000 * 0.5 = 400, y + 1000 * 0.5 = 300.
    expect(clampPan({ x: -5000, y: -5000, scale: 0.5 }, content, viewport)).toEqual({
      x: -600,
      y: -200,
      scale: 0.5,
    });
  });
});

describe("computeEdgeVisibility", () => {
  const all = new Set(WORKS.map((w) => w.id));

  it("gives nubs only to ends of drawn edges", () => {
    const { hasIncoming, hasOutgoing } = computeEdgeVisibility(all);
    for (const id of hasIncoming) expect(EDGES.some((e) => e.to === id)).toBe(true);
    for (const id of hasOutgoing) expect(EDGES.some((e) => e.from === id)).toBe(true);
  });

  it("drops nubs for edges faded out by a selection", () => {
    const active = new Set(["iron-man", "iron-man-2"]);
    const { hasIncoming, hasOutgoing } = computeEdgeVisibility(all, active);
    expect([...hasOutgoing]).toEqual(["iron-man"]);
    expect([...hasIncoming]).toEqual(["iron-man-2"]);
  });
});

describe("movies-only graph", () => {
  const movies = WORK_GRAPHS.movies;
  const ids = new Set(movies.works.map((w) => w.id));

  it("keeps only live-action films", () => {
    expect(movies.works.every((w) => mediumOf(w) === "movie")).toBe(true);
    expect(movies.works.some((w) => w.id === "spider-man-into-the-spider-verse")).toBe(false);
    expect(movies.works.length).toBe(WORKS.filter((w) => mediumOf(w) === "movie").length);
  });

  it("builds a graph for any mix of media", () => {
    const animation = graphForMedia(["animation"]);
    expect(animation.works.every((w) => w.animated)).toBe(true);
    // Across the Spider-Verse follows Into the Spider-Verse directly.
    expect(animation.incoming.get("spider-man-across-the-spider-verse")).toContain(
      "spider-man-into-the-spider-verse",
    );
    expect(graphForMedia(["movie", "series", "animation"])).toBe(WORK_GRAPHS.all);
  });

  it("only draws edges between films", () => {
    const stray = movies.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to));
    expect(stray).toEqual([]);
  });

  it("bridges chains through hidden series", () => {
    // Multiverse of Madness builds on WandaVision, which follows Endgame.
    const parents = movies.incoming.get("doctor-strange-multiverse-of-madness") ?? [];
    expect(parents).toContain("avengers-endgame");
    expect(parents).not.toContain("wandavision");
  });

  it("still places every film below its prerequisites", () => {
    for (const [child, parents] of movies.incoming) {
      for (const parent of parents) {
        expect(movies.step.get(child)!).toBeGreaterThan(movies.step.get(parent)!);
      }
    }
  });

  it("lays out every film in each mode", () => {
    const grouping: Grouping = {
      by: "franchise",
      visible: new Set(GROUPS.franchise.map((g) => g.key)),
    };
    for (const mode of MODES) {
      expect(computeLayout(mode, grouping, movies).positions.size).toBe(movies.works.length);
    }
  });
});

describe("fitBox", () => {
  const viewport = { width: 1000, height: 800 };
  const insets = { left: 20, top: 80, right: 20, bottom: 200 };

  it("centers the box in the uncovered area", () => {
    const box = { left: 100, top: 100, right: 300, bottom: 200 };
    const { x, y, scale } = fitBox(box, viewport, insets, 0.2, 1.5);
    // The box's center lands on the center of the uncovered area.
    expect(x + 200 * scale).toBeCloseTo(20 + 960 / 2);
    expect(y + 150 * scale).toBeCloseTo(80 + 520 / 2);
  });

  it("scales to the tighter axis, within the limits", () => {
    const wide = fitBox({ left: 0, top: 0, right: 4800, bottom: 100 }, viewport, insets, 0.1, 1.5);
    expect(wide.scale).toBeCloseTo(960 / 4800);
    const tiny = fitBox({ left: 0, top: 0, right: 10, bottom: 10 }, viewport, insets, 0.2, 0.8);
    expect(tiny.scale).toBe(0.8);
    const huge = fitBox({ left: 0, top: 0, right: 1e6, bottom: 1e6 }, viewport, insets, 0.2, 0.8);
    expect(huge.scale).toBe(0.2);
  });
});

describe("phase bands", () => {
  for (const by of ["franchise", "earth"] as const) {
    it(`never take in works outside the phases (by ${by})`, () => {
      const grouping: Grouping = { by, visible: new Set(GROUPS[by].map((g) => g.key)) };
      const layout = computeLayout("recommended", grouping);
      const bands = computePhaseBands("recommended", layout, grouping);
      const inside = WORKS.filter((w) => w.phase === undefined)
        .filter((w) => {
          const { x, y } = layout.positions.get(w.id)!;
          return bands.some(
            (band) =>
              x >= band.left &&
              x <= band.left + band.width &&
              y >= band.top &&
              y <= band.top + band.height,
          );
        })
        .map((w) => w.id);
      expect(inside).toEqual([]);
    });
  }

  it("place the One-Shots right beside their phase band", () => {
    const grouping: Grouping = {
      by: "franchise",
      visible: new Set(GROUPS.franchise.map((g) => g.key)),
    };
    const layout = computeLayout("recommended", grouping);
    const bands = computePhaseBands("recommended", layout, grouping);
    const column = 100 / layout.totalLanes;
    for (const w of WORKS.filter((w) => w.id.startsWith("one-shot-"))) {
      const { x, y } = layout.positions.get(w.id)!;
      const band = bands.find((b) => y >= b.top && y <= b.top + b.height)!;
      // Within a few lanes of the band's right edge, not across the canvas.
      expect(x - (band.left + band.width)).toBeLessThan(3 * column);
    }
  });
  it("shrink to the rows their works sit in when filtered", () => {
    // Grouped by Earth with animation only, Phase 5 on Earth-616 is just
    // I Am Groot S2; the band used to reach down to Phase 6's first row.
    const graph = graphForMedia(["animation"]);
    for (const grouping of [
      { by: "franchise", visible: new Set(GROUPS.franchise.map((g) => g.key)) },
      { by: "earth", visible: new Set(GROUPS.earth.map((g) => g.key)) },
    ] satisfies Grouping[]) {
      const layout = computeLayout("recommended", grouping, graph);
      const row = 100 / (graph.maxStep + 1);
      for (const band of computePhaseBands("recommended", layout, grouping, graph)) {
        const rows = new Set(
          graph.works
            .filter(
              (w) =>
                w.phase === band.phase && groupKeyOf(w, grouping.by) === PHASE_GROUP[grouping.by],
            )
            .map((w) => graph.step.get(w.id)),
        );
        expect(Math.round((band.height + 0.5) / row)).toBe(rows.size);
      }
    }
  });
});

describe("Earth grouping", () => {
  it("keeps another franchise on Earth-616 outside the MCU phase bands", () => {
    const grouping: Grouping = { by: "earth", visible: new Set(GROUPS.earth.map((g) => g.key)) };
    const layout = computeLayout("recommended", grouping);
    const bands = computePhaseBands("recommended", layout, grouping);
    const inside = WORKS.filter((w) => w.franchise === "defenders")
      .filter((w) => {
        const { x } = layout.positions.get(w.id)!;
        return bands.some((band) => x >= band.left && x <= band.left + band.width);
      })
      .map((w) => w.id);
    expect(inside).toEqual([]);
  });
});

describe("computeActiveSet", () => {
  const graph = WORK_GRAPHS.all;
  const grouping: Grouping = {
    by: "franchise",
    visible: new Set(GROUPS.franchise.map((g) => g.key)),
  };
  const base = { distances: new Map<string, number>(), grouping, graph };

  it("is null when nothing is selected or focused", () => {
    expect(
      computeActiveSet({
        ...base,
        selectedId: null,
        focusedPhase: undefined,
        focusedGroup: undefined,
      }),
    ).toBeNull();
  });

  it("prefers a selection and its relatives over a focused group", () => {
    const set = computeActiveSet({
      ...base,
      selectedId: "iron-man",
      distances: new Map([["iron-man-2", 1]]),
      focusedPhase: 3,
      focusedGroup: "x-men",
    });
    expect([...set!].sort()).toEqual(["iron-man", "iron-man-2"]);
  });

  it("takes a phase's works from the phase group only", () => {
    const set = computeActiveSet({
      ...base,
      selectedId: null,
      focusedPhase: 1,
      focusedGroup: undefined,
    });
    expect(set!.has("iron-man")).toBe(true);
    expect([...set!].every((id) => WORKS.find((w) => w.id === id)!.franchise === "mcu")).toBe(true);
  });

  it("takes a group's works", () => {
    const set = computeActiveSet({
      ...base,
      selectedId: null,
      focusedPhase: undefined,
      focusedGroup: "ssu",
    });
    expect(set!.has("venom")).toBe(true);
    expect(set!.has("iron-man")).toBe(false);
  });
});

describe("edgesToDraw", () => {
  const edges = WORK_GRAPHS.all.edges;

  it("draws every edge in recommended mode", () => {
    expect(edgesToDraw("recommended", edges, null, null)).toBe(edges);
  });

  it("lights a selection's references and draws them in timelines", () => {
    const reference = edges.find((e) => e.kind === "reference")!;
    const active = computeActiveSet({
      selectedId: reference.to,
      distances: new Map(),
      focusedPhase: undefined,
      focusedGroup: undefined,
      grouping: { by: "franchise", visible: new Set(GROUPS.franchise.map((g) => g.key)) },
      graph: WORK_GRAPHS.all,
    });
    expect(active!.has(reference.from)).toBe(true);
    expect(edgesToDraw("release", edges, reference.to, active)).toContain(reference);
  });

  it("draws nothing in timelines until something is selected", () => {
    expect(edgesToDraw("release", edges, null, null)).toEqual([]);
    expect(edgesToDraw("chronology", edges, null, new Set(["iron-man"]))).toEqual([]);
  });

  it("draws only a selection's ties in timelines", () => {
    const active = new Set(["iron-man", "iron-man-2", "avengers"]);
    const drawn = edgesToDraw("release", edges, "iron-man", active);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((e) => active.has(e.from) && active.has(e.to))).toBe(true);
  });
});

describe("computeYearMarks", () => {
  const grouping: Grouping = {
    by: "franchise",
    visible: new Set(GROUPS.franchise.map((g) => g.key)),
  };

  it("marks each year change within a decade, in order, and none in recommended mode", () => {
    expect(
      computeYearMarks("recommended", computeLayout("recommended", grouping), grouping),
    ).toEqual([]);
    const marks = computeYearMarks("release", computeLayout("release", grouping), grouping);
    expect(marks.length).toBeGreaterThan(10);
    const years = marks.map((m) => m.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(years.some((y) => y % 10 === 0)).toBe(false);
  });
});

describe("timeline layouts", () => {
  const grouping: Grouping = {
    by: "franchise",
    visible: new Set(GROUPS.franchise.map((g) => g.key)),
  };

  for (const mode of ["release", "chronology"] as const) {
    it(`never runs a year backwards from left to right (${mode})`, () => {
      const { positions } = computeLayout(mode, grouping);
      const backwards = WORKS.flatMap((a) =>
        WORKS.filter(
          (b) =>
            timelineYear(a, mode) < timelineYear(b, mode) &&
            positions.get(a.id)!.x >= positions.get(b.id)!.x,
        ).map((b) => `${a.id} → ${b.id}`),
      );
      expect(backwards).toEqual([]);
    });
  }

  it("colors decade bands through the rainbow, oldest to newest", () => {
    const layout = computeLayout("release", grouping);
    const hues = computeEraBands("release", layout, grouping).map((band) =>
      Number(band.color.match(/^hsla\((\d+),/)![1]),
    );
    expect(hues[0]).toBe(0);
    expect(hues.at(-1)).toBe(270);
    expect(hues).toEqual([...hues].sort((a, b) => a - b));
  });
});

describe("decade bands", () => {
  const grouping: Grouping = {
    by: "franchise",
    visible: new Set(GROUPS.franchise.map((g) => g.key)),
  };

  for (const mode of ["release", "chronology"] as const) {
    it(`tile the canvas with no decade narrower than three columns (${mode})`, () => {
      const layout = computeLayout(mode, grouping);
      const bands = computeEraBands(mode, layout, grouping);
      const column = 100 / layout.totalLanes;
      expect(bands.every((band) => band.width >= 3 * column - 1e-9)).toBe(true);
      const gaps = bands
        .slice(1)
        .map((band, i) => Math.abs(band.left - (bands[i].left + bands[i].width)));
      expect(Math.max(0, ...gaps)).toBeLessThan(1e-9);
      expect(bands[0].left).toBeCloseTo(0);
      expect(bands.at(-1)!.left + bands.at(-1)!.width).toBeCloseTo(100);
    });
  }
});

describe("mergedPath", () => {
  it("draws a stretch shared by several edges once", () => {
    const a = elbowPieces({ x: 0, y: 0 }, { x: 0, y: 50 }, 1, 5, "y");
    const b = elbowPieces({ x: 0, y: 20 }, { x: 0, y: 80 }, 1, 5, "y");
    expect(mergedPath([a, b])).toBe("M 0 0 L 0 80");
  });

  it("keeps separate stretches apart", () => {
    const a = elbowPieces({ x: 0, y: 0 }, { x: 0, y: 10 }, 1, 5, "y");
    const b = elbowPieces({ x: 0, y: 20 }, { x: 0, y: 30 }, 1, 5, "y");
    expect(mergedPath([a, b])).toBe("M 0 0 L 0 10 M 0 20 L 0 30");
  });
});
