import { describe, expect, it } from "vitest";

import { isUpcoming, WORKS } from "./works";

describe("isUpcoming", () => {
  const work = WORKS.find((w) => w.id === "visionquest")!;

  it("is true before the release date and false from that day", () => {
    const [year, month, day] = work.releaseDate.split("-").map(Number);
    expect(isUpcoming(work, new Date(year, month - 1, day - 1, 12))).toBe(true);
    expect(isUpcoming(work, new Date(year, month - 1, day, 12))).toBe(false);
  });

  it("marks month-only dates on works still to come", () => {
    for (const w of WORKS.filter((w) => w.releaseMonthOnly)) {
      expect(w.releaseDate.endsWith("-01")).toBe(true);
    }
  });
});
