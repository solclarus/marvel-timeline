import {
  EARTH_META,
  earthsOf,
  FRANCHISE_META,
  type EarthId,
  type Franchise,
  type WorkNode,
} from "@/data/works";

// What the map's bands (lanes or rows) and the legend's toggles are split by.
// By Earth, a work sits in its home Earth's band.
export type GroupBy = "franchise" | "earth";

export interface Grouping {
  by: GroupBy;
  visible: Set<string>;
}

export interface GroupMeta {
  key: string;
  label: string;
  colorClass: string;
  // Earths only: their works sit in an outlined card, set apart from the
  // MCU phases' filled ones.
  cardClass?: string;
}

const FRANCHISE_ORDER: Franchise[] = ["x-men", "mcu", "spider-man-legacy", "ssu"];
// Mirrors the franchise order, with the MCU's other Earths beside 616.
// Earth-838 is left out: no work is set there, it's only crossed into.
const EARTH_ORDER: EarthId[] = ["10005", "616", "828", "multiverse", "96283", "120703", "688"];

export const GROUPS: Record<GroupBy, GroupMeta[]> = {
  franchise: FRANCHISE_ORDER.map((key) => ({ key, ...FRANCHISE_META[key] })),
  earth: EARTH_ORDER.map((key) => ({ key, ...EARTH_META[key] })),
};

// Everything starts visible.
export const DEFAULT_VISIBLE_GROUPS: Record<GroupBy, string[]> = {
  franchise: FRANCHISE_ORDER,
  earth: EARTH_ORDER,
};

// The band MCU phase backgrounds are drawn around.
export const PHASE_GROUP: Record<GroupBy, string> = { franchise: "mcu", earth: "616" };

export function groupKeyOf(work: WorkNode, by: GroupBy): string {
  return by === "franchise" ? work.franchise : earthsOf(work)[0];
}

export function isGroupKey(by: GroupBy, key: string): boolean {
  return GROUPS[by].some((group) => group.key === key);
}

export function visibleGroups(grouping: Grouping): GroupMeta[] {
  return GROUPS[grouping.by].filter((group) => grouping.visible.has(group.key));
}

export function isWorkVisible(work: WorkNode, grouping: Grouping): boolean {
  return grouping.visible.has(groupKeyOf(work, grouping.by));
}

// Switching what to group by keeps the same works on screen: the new
// visible groups are those of the works visible now.
export function regroup(grouping: Grouping, by: GroupBy, works: WorkNode[]): Grouping {
  if (grouping.by === by) return grouping;
  const visible = new Set(
    works.filter((w) => isWorkVisible(w, grouping)).map((w) => groupKeyOf(w, by)),
  );
  return { by, visible: visible.size > 0 ? visible : new Set(DEFAULT_VISIBLE_GROUPS[by]) };
}
