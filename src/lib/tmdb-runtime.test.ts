import { describe, expect, it } from "vitest";

import { WORKS } from "../data/works";
import { runtimeOf } from "./tmdb-runtime";

const film = WORKS.find((w) => w.tmdb.type === "movie")!;
const season = WORKS.find((w) => w.tmdb.type === "tv")!;

describe("runtimeOf", () => {
  it("takes a film's runtime", () => {
    expect(runtimeOf(film, { runtime: 126 })).toEqual({ minutes: 126 });
    expect(runtimeOf(film, { runtime: 0 })).toBeNull();
  });

  it("adds up a season's episodes", () => {
    expect(runtimeOf(season, { episodes: [{ runtime: 50 }, { runtime: 45 }] })).toEqual({
      minutes: 95,
      episodes: 2,
    });
  });

  it("leaves a season out until every episode has a runtime", () => {
    expect(runtimeOf(season, { episodes: [{ runtime: 50 }, { runtime: null }] })).toBeNull();
    expect(runtimeOf(season, { episodes: [] })).toBeNull();
  });
});
