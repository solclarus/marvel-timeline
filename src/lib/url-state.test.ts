import { describe, expect, it } from "vitest";

import { DEFAULT_VISIBLE_GROUPS, GROUPS } from "./graph/groups";
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
      groupBy: "franchise",
      visibleGroups: new Set(["mcu", "x-men"]),
      media: ["movie", "animation"],
      display: "list",
      listFocus: { kind: "before", id: "logan" },
    };
    const search = serializeUrlState(state);
    expect(search).toBe(
      "?work=logan&view=list&list=before%3Alogan&mode=chronology&focus=immediate&media=movie%2Canimation&show=x-men%2Cmcu",
    );
    expect(parseUrlState(search)).toEqual(state);
  });

  it("falls back to defaults for unknown values", () => {
    expect(
      parseUrlState("?work=nope&mode=nope&focus=nope&view=compact&group=nope&show=nope&media=nope"),
    ).toEqual(DEFAULT_URL_STATE);
  });

  it("shows the MCU alone by default, and keeps every group when asked", () => {
    expect([...parseUrlState("").visibleGroups]).toEqual(["mcu"]);
    const all = {
      ...DEFAULT_URL_STATE,
      visibleGroups: new Set(GROUPS.franchise.map((g) => g.key)),
    };
    expect(parseUrlState(serializeUrlState(all)).visibleGroups).toEqual(all.visibleGroups);
  });

  it("shows the franchise of a linked work", () => {
    const { visibleGroups } = parseUrlState("?work=logan&show=mcu");
    expect([...visibleGroups].sort()).toEqual(["mcu", "x-men"]);
  });

  it("groups by Earth, showing a linked work's home Earth", () => {
    const state = parseUrlState("?work=amazing-spider-man&group=earth&show=616");
    expect(state.groupBy).toBe("earth");
    expect([...state.visibleGroups].sort()).toEqual(["120703", "616"]);
    expect(serializeUrlState(state)).toBe("?work=amazing-spider-man&group=earth&show=616%2C120703");
  });

  it("ignores franchise keys when grouping by Earth", () => {
    expect([...parseUrlState("?group=earth&show=mcu").visibleGroups]).toEqual(
      DEFAULT_VISIBLE_GROUPS.earth,
    );
  });

  it("adds the linked work's kind to the media filter", () => {
    expect(parseUrlState("?work=wandavision&media=movie").media).toEqual(["movie", "series"]);
    expect(parseUrlState("?work=what-if-s1&media=movie").media).toEqual(["movie", "animation"]);
    expect(parseUrlState("?work=logan&media=movie").media).toEqual(["movie"]);
  });

  it("still opens older media links", () => {
    expect(parseUrlState("?media=movies").media).toEqual(["movie"]);
    expect(parseUrlState("?media=all").media).toEqual(DEFAULT_URL_STATE.media);
  });
});
