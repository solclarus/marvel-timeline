import { describe, expect, it } from "vitest";

import { REVIEWED } from "@/data/reviewed-on-tmdb";
import { WORKS } from "@/data/works";

import { newWorks } from "./new-works";

const today = new Date("2026-11-28");
const thor = WORKS.find((w) => w.id === "thor")!;
const wandaVision = WORKS.find((w) => w.id === "wandavision")!;

describe("newWorks", () => {
  it("lists recent and coming works the map doesn't have, soonest first", () => {
    const found = newWorks(
      WORKS,
      [
        { kind: "movie", id: thor.tmdb.id, title: "Thor", date: "2011-04-27" },
        { kind: "movie", id: 1, title: "Old", date: "2019-01-01" },
        { kind: "movie", id: 2, title: "Later", date: "2027-05-01" },
        { kind: "movie", id: 3, title: "Sooner", date: "2026-12-01" },
        { kind: "tv", id: 4, title: "Undated", date: "" },
      ],
      [],
      REVIEWED,
      today,
    );
    expect(found.map((c) => c.title)).toEqual(["Sooner", "Later", "Undated"]);
  });

  it("lists a new season of a show on the map, but not one it has", () => {
    const show = wandaVision.tmdb.id;
    const found = newWorks(
      WORKS,
      [{ kind: "tv", id: show, title: "WandaVision", date: "2021-01-14" }],
      [
        { show, title: "WandaVision", season: wandaVision.tmdb.season ?? 1, date: "2021-01-14" },
        { show, title: "WandaVision", season: 9, date: "2027-01-01" },
      ],
      REVIEWED,
      today,
    );
    expect(found).toEqual([
      { key: `tv/${show}/season/9`, title: "WandaVision — Season 9", date: "2027-01-01" },
    ]);
  });

  it("skips reviewed works, unless one waiting for a date now has one", () => {
    const found = newWorks(
      WORKS,
      [
        { kind: "tv", id: 318417, title: "Podcast", date: "2026-12-01" },
        { kind: "movie", id: 1731190, title: "Nova", date: "" },
      ],
      [],
      REVIEWED,
      today,
    );
    expect(found).toEqual([]);
    const dated = newWorks(
      WORKS,
      [{ kind: "movie", id: 1731190, title: "Nova", date: "2028-06-01" }],
      [],
      REVIEWED,
      today,
    );
    expect(dated.map((c) => c.title)).toEqual(["Nova"]);
  });
});
