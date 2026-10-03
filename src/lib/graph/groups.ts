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
  // Each group's works sit in an outlined card, set apart from the MCU
  // phases' filled ones.
  cardClass: string;
}

const FRANCHISE_ORDER: Franchise[] = [
  "legacy",
  "x-men",
  "mcu",
  "defenders",
  "spider-man-legacy",
  "ssu",
  "spider-verse",
  "animation",
];
// Starts from 616, the Sacred Timeline, then goes outward by how directly
// each Earth meets it: its variants, Earths that cross into it, Earths
// reached only through those, and finally Earths with no tie at all.
// Earths 838, 65, and 42 are left out: no work is set there, they're only
// crossed into.
const EARTH_ORDER: EarthId[] = [
  "616",
  "multiverse", // What If's variants of the Sacred Timeline
  "89521", // What If's zombie world, home of Marvel Zombies
  "828", // meets 616 in Avengers: Doomsday
  "10005", // Deadpool & Wolverine
  "86445", // an alternate 616 (Your Friendly Neighborhood Spider-Man)
  "96283", // No Way Home
  "120703", // No Way Home
  "688", // Venom sequels' 616 visits
  "1610", // via Earth-688 in Across the Spider-Verse
  "26320", // via Deadpool & Wolverine's Void
  "701306",
  "121698",
  "92131", // X-Men '97: no ties
];

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
