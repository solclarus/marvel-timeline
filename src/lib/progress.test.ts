import { describe, expect, it } from "vitest";

import { isUpcoming, WORKS } from "@/data/works";
import { INCOMING } from "@/lib/graph/relations";

import { progressOf } from "./progress";

const today = new Date("2026-11-28T12:00:00Z");
const out = WORKS.filter((w) => !isUpcoming(w, today));

describe("progressOf", () => {
  it("counts only what's out", () => {
    const progress = progressOf(new Set(), today);
    expect(progress.works).toEqual({ watched: 0, total: out.length });
    expect(progress.phases.reduce((sum, p) => sum + p.total, 0)).toBe(
      out.filter((w) => w.franchise === "mcu" && w.phase).length,
    );
    expect(progress.franchises.reduce((sum, f) => sum + f.total, 0)).toBe(out.length);
  });

  it("starts with the MCU's first works", () => {
    const { nextUp } = progressOf(new Set(), today);
    expect(nextUp[0].id).toBe("iron-man");
    expect(nextUp.every((w) => w.franchise === "mcu" && !INCOMING.get(w.id)?.length)).toBe(true);
  });

  it("offers what watching unlocks, never a work already watched", () => {
    const watched = new Set(["iron-man", "iron-man-2", "incredible-hulk"]);
    const progress = progressOf(watched, today);
    expect(progress.works.watched).toBe(3);
    expect(progress.minutes.watched).toBeGreaterThan(0);
    for (const work of progress.nextUp) {
      expect(watched.has(work.id)).toBe(false);
      expect((INCOMING.get(work.id) ?? []).every((id) => watched.has(id))).toBe(true);
    }
    // Phase 1 is three of its works in.
    expect(progress.phases[0]).toMatchObject({ phase: 1, watched: 3 });
  });
});
