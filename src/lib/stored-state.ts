import { useSyncExternalStore } from "react";

// A value kept in localStorage and shared by every component that reads it.
// Storage can be unavailable (private modes, blocked cookies); the value then
// lasts for the visit only.
export function storedState<T>(
  key: string,
  parse: (raw: string | null) => T,
  save: (value: T) => string,
) {
  let value: T | undefined;
  const listeners = new Set<() => void>();

  const get = (): T => {
    if (value === undefined) {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(key);
      } catch {
        // Unavailable: start from the default.
      }
      value = parse(raw);
    }
    return value;
  };

  const set = (next: T) => {
    value = next;
    try {
      window.localStorage.setItem(key, save(next));
    } catch {
      // Unavailable: keep it for this visit.
    }
    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const use = (): [T, (next: T) => void] => [useSyncExternalStore(subscribe, get), set];

  return { get, set, use };
}
