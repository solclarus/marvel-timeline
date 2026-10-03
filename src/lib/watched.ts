import { useEffect, useState } from "react";

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

  return { watched, toggleWatched };
}

// Unwatched works whose prerequisites are all watched. Works with no
// prerequisites are left out: they'd light up every entry point at once.
export function computeNextUp(watched: Set<string>): Set<string> {
  const nextUp = new Set<string>();
  for (const [id, parents] of INCOMING) {
    if (watched.has(id)) continue;
    if (parents.every((parent) => watched.has(parent))) nextUp.add(id);
  }
  return nextUp;
}
