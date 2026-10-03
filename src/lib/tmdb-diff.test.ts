import { describe, expect, it } from "vitest";

import { WORKS } from "@/data/works";

import { diffWork, tmdbPath } from "./tmdb-diff";

const ironMan = WORKS.find((w) => w.id === "iron-man")!;
const wandaVision = WORKS.find((w) => w.id === "wandavision")!;

describe("tmdbPath", () => {
  it("uses the movie or season endpoint", () => {
    expect(tmdbPath(ironMan)).toBe(`/movie/${ironMan.tmdb.id}`);
    expect(tmdbPath(wandaVision)).toMatch(new RegExp(`^/tv/${wandaVision.tmdb.id}/season/\\d+$`));
  });
});

describe("diffWork", () => {
  it("reports nothing when TMDB matches", () => {
    expect(
      diffWork(ironMan, { release_date: ironMan.releaseDate, poster_path: ironMan.poster }),
    ).toEqual([]);
  });

  it("reports a changed date and poster", () => {
    expect(diffWork(ironMan, { release_date: "2008-05-02", poster_path: "/new.jpg" })).toEqual([
      { id: "iron-man", field: "releaseDate", ours: ironMan.releaseDate, tmdb: "2008-05-02" },
      { id: "iron-man", field: "poster", ours: ironMan.poster, tmdb: "/new.jpg" },
    ]);
  });

  it("reads a season's air date, and skips values TMDB doesn't have yet", () => {
    expect(diffWork(wandaVision, { air_date: "2030-01-01", release_date: "1999-01-01" })).toEqual([
      {
        id: "wandavision",
        field: "releaseDate",
        ours: wandaVision.releaseDate,
        tmdb: "2030-01-01",
      },
    ]);
    expect(diffWork(wandaVision, { air_date: null, poster_path: "" })).toEqual([]);
  });
});
