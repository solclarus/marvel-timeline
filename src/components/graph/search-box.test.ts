import { describe, expect, it } from "vitest";

import { searchWorks } from "./search-box";

describe("searchWorks", () => {
  it("ignores case and punctuation", () => {
    expect(searchWorks("spider man no way").map((w) => w.id)).toEqual(["spider-man-no-way-home"]);
  });

  it("ranks title prefixes first", () => {
    const ids = searchWorks("thor").map((w) => w.id);
    expect(ids[0]).toBe("thor");
    expect(ids).toContain("thor-ragnarok");
  });

  it("returns nothing for a blank query", () => {
    expect(searchWorks("  ")).toEqual([]);
  });
});
