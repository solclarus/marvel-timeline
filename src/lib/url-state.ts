import { FRANCHISE_META, type Franchise } from "@/data/works";
import type { DisplayMode, ViewMode } from "@/lib/graph/layout";
import { WORK_BY_ID, type FocusMode } from "@/lib/graph/relations";

// Everything a shared link restores. Zoom and pan are left out: they depend
// on the viewer's screen.
export interface UrlState {
  mode: ViewMode;
  selectedId: string | null;
  focusMode: FocusMode;
  displayMode: DisplayMode;
  visibleFranchises: Set<Franchise>;
}

const FRANCHISES = Object.keys(FRANCHISE_META) as Franchise[];
const VIEW_MODES: readonly ViewMode[] = ["recommended", "release", "chronology"];
const FOCUS_MODES: readonly FocusMode[] = ["chain", "immediate"];
const DISPLAY_MODES: readonly DisplayMode[] = ["inline", "compact"];

export const DEFAULT_URL_STATE: UrlState = {
  mode: "recommended",
  selectedId: null,
  focusMode: "chain",
  displayMode: "inline",
  visibleFranchises: new Set(["mcu"]),
};

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// Unknown or malformed values fall back to the defaults, so a stale link
// still opens.
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const work = params.get("work");
  const selected = work ? WORK_BY_ID.get(work) : undefined;

  const shown = (params.get("show") ?? "")
    .split(",")
    .filter((f): f is Franchise => FRANCHISES.includes(f as Franchise));
  const visibleFranchises = new Set(shown.length > 0 ? shown : DEFAULT_URL_STATE.visibleFranchises);
  // A linked work must be on the map.
  if (selected) visibleFranchises.add(selected.franchise);

  return {
    mode: pick(params.get("mode"), VIEW_MODES, DEFAULT_URL_STATE.mode),
    selectedId: selected?.id ?? null,
    focusMode: pick(params.get("focus"), FOCUS_MODES, DEFAULT_URL_STATE.focusMode),
    displayMode: pick(params.get("view"), DISPLAY_MODES, DEFAULT_URL_STATE.displayMode),
    visibleFranchises,
  };
}

// Defaults are omitted, so the plain URL stays plain.
export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.selectedId) params.set("work", state.selectedId);
  if (state.mode !== DEFAULT_URL_STATE.mode) params.set("mode", state.mode);
  if (state.focusMode !== DEFAULT_URL_STATE.focusMode) params.set("focus", state.focusMode);
  if (state.displayMode !== DEFAULT_URL_STATE.displayMode) params.set("view", state.displayMode);

  const shown = FRANCHISES.filter((f) => state.visibleFranchises.has(f));
  const defaults = FRANCHISES.filter((f) => DEFAULT_URL_STATE.visibleFranchises.has(f));
  if (shown.join(",") !== defaults.join(",")) params.set("show", shown.join(","));

  const query = params.toString();
  return query ? `?${query}` : "";
}
