import { useSyncExternalStore } from "react";

// Wide screens (Tailwind's `lg`, 1024px on) lay the app out differently: the
// card is a sidebar on the left and the controls stand on the right.
export const WIDE_QUERY = "(min-width: 1024px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_QUERY).matches);
}
