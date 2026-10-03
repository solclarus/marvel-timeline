import { useEffect, useState } from "react";

import { WORKS } from "@/data/works";
import { INCOMING, WORK_BY_ID } from "@/lib/graph/relations";

const STORAGE_KEY = "marvel-timeline:watched";

// Storage can be missing or throw (private mode, blocked site data), so the
// app just starts empty.
function load(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids)) return new Set();
    // Drops ids of works that have since been removed from the data.
    return new Set(ids.filter((id): id is string => WORK_BY_ID.has(id)));
  } catch {
    return new Set();
  }
}

function save(watched: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...watched]));
  } catch {
    // Best effort: the session still works, it just won't be remembered.
  }
}

export function useWatched() {
  const [watched, setWatched] = useState(load);

  useEffect(() => save(watched), [watched]);

  const toggleWatched = (id: string) => {
    setWatched((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearWatched = () => setWatched(new Set());

  return { watched, toggleWatched, clearWatched };
}

// Unwatched works whose prerequisites are all watched. Works with no
// prerequisites only count once something in their franchise is watched, so
// a fresh visit doesn't light up every entry point at once.
export function computeNextUp(watched: Set<string>): Set<string> {
  const startedFranchises = new Set([...watched].map((id) => WORK_BY_ID.get(id)!.franchise));
  const nextUp = new Set<string>();
  for (const work of WORKS) {
    if (watched.has(work.id)) continue;
    const parents = INCOMING.get(work.id);
    const ready = parents
      ? parents.every((parent) => watched.has(parent))
      : startedFranchises.has(work.franchise);
    if (ready) nextUp.add(work.id);
  }
  return nextUp;
}
