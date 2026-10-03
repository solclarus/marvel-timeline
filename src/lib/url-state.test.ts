import { describe, expect, it } from "vitest";

import { DEFAULT_URL_STATE, parseUrlState, serializeUrlState, type UrlState } from "./url-state";

describe("url state", () => {
  it("serializes the defaults to an empty query", () => {
    expect(serializeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(parseUrlState("")).toEqual(DEFAULT_URL_STATE);
  });

  it("round-trips every field", () => {
    const state: UrlState = {
      mode: "chronology",
      selectedId: "logan",
      focusMode: "immediate",
      displayMode: "compact",
      visibleFranchises: new Set(["mcu", "x-men"]),
    };
    const search = serializeUrlState(state);
    expect(search).toBe(
      "?work=logan&mode=chronology&focus=immediate&view=compact&show=mcu%2Cx-men",
    );
    expect(parseUrlState(search)).toEqual(state);
  });

  it("falls back to defaults for unknown values", () => {
    expect(parseUrlState("?work=nope&mode=nope&focus=nope&view=nope&show=nope")).toEqual(
      DEFAULT_URL_STATE,
    );
  });

  it("shows the franchise of a linked work", () => {
    const { visibleFranchises } = parseUrlState("?work=logan");
    expect([...visibleFranchises].sort()).toEqual(["mcu", "x-men"]);
  });
});
