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
      groupBy: "franchise",
      visibleGroups: new Set(["mcu", "x-men"]),
    };
    const search = serializeUrlState(state);
    expect(search).toBe(
      "?work=logan&mode=chronology&focus=immediate&view=compact&show=x-men%2Cmcu",
    );
    expect(parseUrlState(search)).toEqual(state);
  });

  it("falls back to defaults for unknown values", () => {
    expect(parseUrlState("?work=nope&mode=nope&focus=nope&view=nope&group=nope&show=nope")).toEqual(
      DEFAULT_URL_STATE,
    );
  });

  it("shows the franchise of a linked work", () => {
    const { visibleGroups } = parseUrlState("?work=logan");
    expect([...visibleGroups].sort()).toEqual(["mcu", "x-men"]);
  });

  it("groups by Earth, showing a linked work's home Earth", () => {
    const state = parseUrlState("?work=amazing-spider-man&group=earth");
    expect(state.groupBy).toBe("earth");
    expect([...state.visibleGroups].sort()).toEqual(["120703", "616"]);
    expect(serializeUrlState(state)).toBe("?work=amazing-spider-man&group=earth&show=616%2C120703");
  });

  it("ignores franchise keys when grouping by Earth", () => {
    expect([...parseUrlState("?group=earth&show=mcu").visibleGroups]).toEqual(["616"]);
  });
});
