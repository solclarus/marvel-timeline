import { describe, expect, it } from "vitest";

import { INCOMING } from "@/lib/graph/relations";

import { computeNextUp } from "./watched";

describe("computeNextUp", () => {
  it("is empty before anything is watched", () => {
    expect(computeNextUp(new Set())).toEqual(new Set());
  });

  it("unlocks a sequel once its prerequisite is watched", () => {
    const nextUp = computeNextUp(new Set(["iron-man"]));
    expect(nextUp.has("iron-man-2")).toBe(true);
    expect(nextUp.has("iron-man")).toBe(false);
  });

  it("only lists works whose prerequisites are all watched", () => {
    const watched = new Set(["iron-man", "iron-man-2"]);
    for (const id of computeNextUp(watched)) {
      expect(watched.has(id)).toBe(false);
      expect(INCOMING.get(id)!.every((parent) => watched.has(parent))).toBe(true);
    }
  });
});
