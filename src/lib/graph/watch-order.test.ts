import { describe, expect, it } from "vitest";

import { WORKS } from "@/data/works";

import { getRelatedDistances, INCOMING, WORK_GRAPHS } from "./relations";
import { watchFirst } from "./watch-order";

const ids = (id: string, graph = WORK_GRAPHS.all) => watchFirst(id, graph).map((s) => s.work.id);

describe("watchFirst", () => {
  it("is empty for a work with no prerequisites", () => {
    expect(watchFirst("iron-man", WORK_GRAPHS.all)).toEqual([]);
  });

  it("lists every ancestor once, matching the full-chain highlight", () => {
    const list = ids("avengers-endgame");
    const ancestors = [...getRelatedDistances("avengers-endgame", "chain")]
      .filter(([, d]) => d < 0)
      .map(([id]) => id);
    expect(new Set(list).size).toBe(list.length);
    expect([...list].sort()).toEqual([...ancestors].sort());
  });

  it("always puts a work after its own prerequisites", () => {
    for (const target of WORKS) {
      const list = ids(target.id);
      const at = new Map(list.map((id, i) => [id, i]));
      for (const id of list) {
        for (const parent of INCOMING.get(id) ?? []) {
          expect(at.get(parent)).toBeLessThan(at.get(id)!);
        }
      }
    }
  });

  it("flags direct prerequisites", () => {
    const steps = watchFirst("avengers", WORK_GRAPHS.all);
    const direct = steps.filter((s) => s.direct).map((s) => s.work.id);
    expect(direct.sort()).toEqual([...(INCOMING.get("avengers") ?? [])].sort());
    expect(steps.find((s) => s.work.id === "iron-man")!.direct).toBe(false);
  });

  it("follows the films-only graph, skipping series", () => {
    const list = ids("doctor-strange-multiverse-of-madness", WORK_GRAPHS.movies);
    expect(list).not.toContain("wandavision");
    expect(list).toContain("avengers-endgame");
  });
});
