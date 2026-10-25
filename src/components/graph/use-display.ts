import { useState } from "react";

import type { Display } from "@/lib/url-state";

// Phones start on the list; the map is hard to read that small.
export const DEVICE_DISPLAY: Display = window.matchMedia("(max-width: 640px)").matches
  ? "list"
  : "map";

// Map or list. Only the command bar switches it; the card never does.
export function useDisplay(initial: Display | null) {
  return useState<Display>(initial ?? DEVICE_DISPLAY);
}
