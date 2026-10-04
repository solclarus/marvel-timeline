import { useState } from "react";

import type { Display, ListFocus } from "@/lib/url-state";

// Phones start on the list; the map is hard to read that small.
export const DEVICE_DISPLAY: Display = window.matchMedia("(max-width: 640px)").matches
  ? "list"
  : "map";

// Map or list, and the list's optional narrowing to a watch-first path or a
// route. Narrowing switches to the list; clearing it returns to whichever
// display was showing before.
export function useDisplay(initial: { display: Display | null; listFocus: ListFocus | null }) {
  const [display, setDisplay] = useState<Display>(
    initial.listFocus ? "list" : (initial.display ?? DEVICE_DISPLAY),
  );
  const [listFocus, setListFocus] = useState<ListFocus | null>(initial.listFocus);
  const [displayBeforeFocus, setDisplayBeforeFocus] = useState<Display | null>(null);

  const openListFocus = (next: ListFocus) => {
    if (!listFocus) setDisplayBeforeFocus(display);
    setDisplay("list");
    setListFocus(next);
  };
  const clearListFocus = () => {
    setListFocus(null);
    if (displayBeforeFocus) setDisplay(displayBeforeFocus);
    setDisplayBeforeFocus(null);
  };
  const changeDisplay = (next: Display) => {
    setListFocus(null);
    setDisplayBeforeFocus(null);
    setDisplay(next);
  };

  return { display, listFocus, openListFocus, clearListFocus, changeDisplay };
}
