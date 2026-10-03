import { useEffect } from "react";

import { serializeUrlState, type UrlState } from "@/lib/url-state";

// Mirrors the view into the query string so any state can be shared as a
// link. replaceState, not pushState: Back should leave the app, not step
// through every click.
export function useUrlSync({
  mode,
  selectedId,
  focusMode,
  groupBy,
  visibleGroups,
  media,
  display,
}: UrlState) {
  useEffect(() => {
    const search = serializeUrlState({
      mode,
      selectedId,
      focusMode,
      groupBy,
      visibleGroups,
      media,
      display,
    });
    const { pathname, hash } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${hash}`);
  }, [mode, selectedId, focusMode, groupBy, visibleGroups, media, display]);
}
