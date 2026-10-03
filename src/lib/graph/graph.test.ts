import { describe, expect, it } from "vitest";

import { EDGES, WORKS, type Franchise } from "@/data/works";

import { elbowPath } from "./edge-path";
import { BAND_ORDER, computeFocusLayout, computeLayout, type ViewMode } from "./layout";
import { GLOBAL_STEP, getRelatedDistances, INCOMING } from "./relations";
import { wheelZoomFactor, zoomAround } from "./wheel-zoom";

const ALL_FRANCHISES = new Set<Franchise>(BAND_ORDER);
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
  for (const mode of MODES) {
    it(`gives every visible work its own in-bounds cell (${mode})`, () => {
      const { positions } = computeLayout(mode, ALL_FRANCHISES);
      expect(positions.size).toBe(WORKS.length);
      const outOfBounds = [...positions]
        .filter(([, { x, y }]) => x < 0 || x > 100 || y < 0 || y > 100)
        .map(([id]) => id);
      expect(outOfBounds).toEqual([]);
      const cells = [...positions.values()].map(({ x, y }) => `${x.toFixed(4)},${y.toFixed(4)}`);
      expect(new Set(cells).size).toBe(cells.length);
    });
  }

  it("only lays out works from visible franchises", () => {
    const { positions } = computeLayout("recommended", new Set(["mcu"]));
    for (const id of positions.keys()) {
      expect(WORKS.find((w) => w.id === id)!.franchise).toBe("mcu");
    }
  });
});

describe("computeFocusLayout", () => {
  it("rows ancestors above the selection and descendants below", () => {
    const distances = getRelatedDistances("avengers-endgame", "immediate");
    const { positions } = computeFocusLayout("avengers-endgame", distances);
    const selected = positions.get("avengers-endgame")!;
    expect(positions.size).toBe(distances.size + 1);
    const misplaced = [...distances].filter(([id, d]) => {
      const { y } = positions.get(id)!;
      return d < 0 ? y >= selected.y : y <= selected.y;
    });
    expect(misplaced).toEqual([]);
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

describe("wheel zoom", () => {
  it("zooms by the same ratio at any scale", () => {
    const notch = wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false });
    expect(notch).toBeGreaterThan(1.15);
    expect(notch).toBeLessThan(1.25);
    const a = zoomAround({ x: 0, y: 0, scale: 0.3 }, notch, { x: 0, y: 0 }, 0.2, 1.5);
    const b = zoomAround({ x: 0, y: 0, scale: 0.6 }, notch, { x: 0, y: 0 }, 0.2, 1.5);
    expect(a.scale / 0.3).toBeCloseTo(b.scale / 0.6);
  });

  it("undoes a notch with the opposite notch", () => {
    const zoomIn = wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false });
    const zoomOut = wheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false });
    expect(zoomIn * zoomOut).toBeCloseTo(1);
  });

  it("caps line-mode and oversized deltas", () => {
    const line = wheelZoomFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false });
    const huge = wheelZoomFactor({ deltaY: -5000, deltaMode: 0, ctrlKey: false });
    expect(line).toBeLessThan(1.3);
    expect(huge).toBeLessThan(1.3);
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
