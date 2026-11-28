import { beforeEach, describe, expect, it, vi } from "vitest";

describe("watched", () => {
  beforeEach(() => {
    vi.resetModules();
    const items = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => items.set(key, value),
      },
    });
  });

  it("toggles, clears, and remembers works across loads", async () => {
    window.localStorage.setItem("marvel-timeline:watched", '["iron-man","not-a-work"]');
    const first = await import("./watched");
    const store = () => JSON.parse(window.localStorage.getItem("marvel-timeline:watched")!);
    first.toggleWatched("thor");
    // A work no longer on the map is dropped.
    expect(store()).toEqual(["iron-man", "thor"]);
    first.toggleWatched("iron-man");
    expect(store()).toEqual(["thor"]);

    vi.resetModules();
    const second = await import("./watched");
    second.clearWatched();
    expect(store()).toEqual([]);
  });

  it("starts empty when storage holds something else", async () => {
    window.localStorage.setItem("marvel-timeline:watched", "{broken");
    const { toggleWatched } = await import("./watched");
    toggleWatched("thor");
    expect(JSON.parse(window.localStorage.getItem("marvel-timeline:watched")!)).toEqual(["thor"]);
  });
});
