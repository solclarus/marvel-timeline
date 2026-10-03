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

describe("searchWorks in Japanese", () => {
  it("matches Japanese titles, ignoring punctuation and width", () => {
    expect(searchWorks("アイアンマン").map((w) => w.id)).toContain("iron-man");
    expect(searchWorks("ノーウェイ").map((w) => w.id)).toEqual([]);
    expect(searchWorks("ノー ウェイ").map((w) => w.id)).toEqual(["spider-man-no-way-home"]);
    expect(searchWorks("ＬＯＧＡＮ").map((w) => w.id)).toEqual(["logan"]);
  });
});
