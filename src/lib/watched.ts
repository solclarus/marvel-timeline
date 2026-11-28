import { WORK_BY_ID } from "@/lib/graph/relations";

import { storedState } from "./stored-state";

// The works marked as watched, remembered on this device. Ids of works since
// taken off the map are dropped on load.
const store = storedState<ReadonlySet<string>>(
  "marvel-timeline:watched",
  (raw) => {
    try {
      const ids: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids)) return new Set();
      return new Set(ids.filter((id): id is string => WORK_BY_ID.has(id)));
    } catch {
      return new Set();
    }
  },
  (watched) => JSON.stringify([...watched]),
);

export function toggleWatched(id: string) {
  const next = new Set(store.get());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  store.set(next);
}

export function clearWatched() {
  store.set(new Set());
}

export function useWatched(): ReadonlySet<string> {
  return store.use()[0];
}
