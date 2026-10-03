import { ROUTES } from "@/data/routes";
import { MEDIA, mediumOf, type Medium } from "@/data/works";
import {
  DEFAULT_VISIBLE_GROUPS,
  GROUPS,
  groupKeyOf,
  isGroupKey,
  type GroupBy,
} from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import { WORK_BY_ID, type FocusMode, type MediaFilter } from "@/lib/graph/relations";

// Everything a shared link restores. Zoom and pan are left out: they depend
// on the viewer's screen.
export interface UrlState {
  mode: ViewMode;
  selectedId: string | null;
  focusMode: FocusMode;
  groupBy: GroupBy;
  visibleGroups: Set<string>;
  media: MediaFilter;
  // Map or list; null leaves it to the device (a list on phones).
  display: Display | null;
  // The list narrowed to one work's watch-first path or a route.
  listFocus: ListFocus | null;
}

export type ListFocus = { kind: "before"; id: string } | { kind: "route"; id: string };

export type Display = "map" | "list";
const DISPLAYS: readonly Display[] = ["map", "list"];

const GROUP_BYS: readonly GroupBy[] = ["franchise", "earth"];
const VIEW_MODES: readonly ViewMode[] = ["recommended", "release", "chronology"];
const FOCUS_MODES: readonly FocusMode[] = ["chain", "immediate"];

export const DEFAULT_URL_STATE: UrlState = {
  mode: "recommended",
  selectedId: null,
  focusMode: "chain",
  groupBy: "franchise",
  visibleGroups: new Set(DEFAULT_VISIBLE_GROUPS.franchise),
  media: MEDIA,
  display: null,
  listFocus: null,
};

// `list=before:thor-ragnarok` or `list=route:fox-x-men`.
function parseListFocus(value: string | null): ListFocus | null {
  const [kind, id] = (value ?? "").split(":");
  if (kind === "before" && id && WORK_BY_ID.has(id)) return { kind, id };
  if (kind === "route" && id && ROUTES.some((r) => r.id === id)) return { kind, id };
  return null;
}

// `media=movie,animation`; the older `movies` and `all` still open.
function parseMedia(value: string | null): MediaFilter {
  if (value === "movies") return ["movie"];
  const listed = new Set((value ?? "").split(","));
  const media = MEDIA.filter((medium) => listed.has(medium));
  return media.length > 0 ? media : DEFAULT_URL_STATE.media;
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// Unknown or malformed values fall back to the defaults, so a stale link
// still opens.
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const work = params.get("work");
  const selected = work ? WORK_BY_ID.get(work) : undefined;

  const groupBy = pick(params.get("group"), GROUP_BYS, DEFAULT_URL_STATE.groupBy);
  const shown = (params.get("show") ?? "").split(",").filter((key) => isGroupKey(groupBy, key));
  const visibleGroups = new Set(shown.length > 0 ? shown : DEFAULT_VISIBLE_GROUPS[groupBy]);
  // A linked work must be on the map.
  if (selected) visibleGroups.add(groupKeyOf(selected, groupBy));
  const media = withMedium(parseMedia(params.get("media")), selected && mediumOf(selected));

  return {
    mode: pick(params.get("mode"), VIEW_MODES, DEFAULT_URL_STATE.mode),
    selectedId: selected?.id ?? null,
    focusMode: pick(params.get("focus"), FOCUS_MODES, DEFAULT_URL_STATE.focusMode),
    groupBy,
    visibleGroups,
    media,
    display: (DISPLAYS as readonly string[]).includes(params.get("view") ?? "")
      ? (params.get("view") as Display)
      : null,
    listFocus: parseListFocus(params.get("list")),
  };
}

// The filter with `medium` switched on, so a work of that kind shows.
export function withMedium(media: MediaFilter, medium: Medium | undefined): MediaFilter {
  if (!medium || media.includes(medium)) return media;
  return MEDIA.filter((m) => m === medium || media.includes(m));
}

// Defaults are omitted, so the plain URL stays plain.
export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.selectedId) params.set("work", state.selectedId);
  if (state.display) params.set("view", state.display);
  if (state.listFocus) params.set("list", `${state.listFocus.kind}:${state.listFocus.id}`);
  if (state.mode !== DEFAULT_URL_STATE.mode) params.set("mode", state.mode);
  if (state.focusMode !== DEFAULT_URL_STATE.focusMode) params.set("focus", state.focusMode);

  if (state.groupBy !== DEFAULT_URL_STATE.groupBy) params.set("group", state.groupBy);
  if (state.media.length < MEDIA.length) params.set("media", state.media.join(","));

  const keys = GROUPS[state.groupBy].map((group) => group.key);
  const shown = keys.filter((key) => state.visibleGroups.has(key));
  const defaults = keys.filter((key) => DEFAULT_VISIBLE_GROUPS[state.groupBy].includes(key));
  if (shown.join(",") !== defaults.join(",")) params.set("show", shown.join(","));

  const query = params.toString();
  return query ? `?${query}` : "";
}
