import { describe, expect, it } from "vitest";

import { GROUPS, type Grouping } from "./groups";
import { listSections } from "./list";
import { graphForMedia, WORK_GRAPHS } from "./relations";
import { watchFirst } from "./watch-order";

const grouping: Grouping = {
  by: "franchise",
  visible: new Set(GROUPS.franchise.map((g) => g.key)),
};
const ids = (mode: "recommended" | "release" | "chronology", graph = WORK_GRAPHS.all) =>
  listSections(mode, grouping, graph).flatMap((s) => s.works.map((w) => w.id));

describe("listSections", () => {
  it("lists every visible work once in each mode", () => {
    for (const mode of ["recommended", "release", "chronology"] as const) {
      const list = ids(mode);
      expect(new Set(list).size).toBe(WORK_GRAPHS.all.works.length);
      expect(list.length).toBe(WORK_GRAPHS.all.works.length);
    }
  });

  it("puts every work after what it builds on in recommended order", () => {
    const list = ids("recommended");
    const late = list.flatMap((id) =>
      watchFirst(id, WORK_GRAPHS.all)
        .map((s) => s.work.id)
        .filter((before) => list.indexOf(before) > list.indexOf(id)),
    );
    expect(late).toEqual([]);
  });

  it("splits recommended order by saga and timelines by decade", () => {
    expect(
      listSections("recommended", grouping, WORK_GRAPHS.all).map(
        (s) => s.kind === "saga" && s.saga,
      ),
    ).toEqual(["infinity", "multiverse", "mutant"]);
    const decades = listSections("release", grouping, WORK_GRAPHS.all).map(
      (s) => s.kind === "decade" && s.decade,
    );
    expect(decades).toEqual([...decades].sort());
  });

  it("follows the media filter", () => {
    const list = ids("release", graphForMedia(["animation"]));
    expect(list).toContain("x-men-97-s1");
    expect(list).not.toContain("iron-man");
  });
});
