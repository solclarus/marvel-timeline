import { describe, expect, it } from "vitest";

import { WORKS } from "@/data/works";

import { sharePage, sharePages, sharePath } from "./share-pages";

const work = (id: string) => WORKS.find((w) => w.id === id)!;

describe("sharePages", () => {
  it("writes an English and a Japanese page for every work", () => {
    const pages = sharePages();
    expect(pages.size).toBe(WORKS.length * 2);
    expect(pages.has("w/iron-man/index.html")).toBe(true);
    expect(pages.has("w/iron-man/ja.html")).toBe(true);
    expect(sharePath("iron-man", "ja")).toBe("w/iron-man/ja.html");
  });

  it("escapes titles and names at most three works", () => {
    const html = sharePage(work("deadpool-and-wolverine"), "en");
    expect(html).toContain("<title>Deadpool &amp; Wolverine: what to watch first");
    const doomsday = sharePage(work("avengers-doomsday"), "en");
    expect(doomsday).toMatch(/Builds on [^"]+ and \d+ more\./);
  });

  it("says a first work starts here, and sends visitors on with the work", () => {
    const html = sharePage(work("iron-man"), "ja");
    expect(html).toContain("ここから観始められる作品です");
    expect(html).toContain('query.set("work", "iron-man")');
    expect(html).toContain('location.replace("../../?"');
  });
});
