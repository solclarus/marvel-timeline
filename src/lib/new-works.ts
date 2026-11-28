// Finds Marvel Studios works (and new seasons) TMDB lists that the map
// doesn't have yet, for `scripts/check-new-works.ts`. Kept free of path
// aliases so it runs under plain Node.
import type { Reviewed } from "../data/reviewed-on-tmdb.ts";
import type { WorkNode } from "../data/works.ts";

export interface Candidate {
  key: string; // "movie/123", "tv/456" or "tv/456/season/3"
  title: string;
  date: string; // "" when TMDB has none
}

export interface Listed {
  kind: "movie" | "tv";
  id: number;
  title: string;
  date: string;
}

// Only what's recent or coming: older works were weighed when the map was
// drawn up, and TMDB's back catalogue is mostly extras.
const RECENT_DAYS = 365;

export function isCandidateDate(date: string, today: Date): boolean {
  if (!date) return true;
  const cutoff = new Date(today.getTime() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  return date >= cutoff;
}

export function newWorks(
  works: WorkNode[],
  listed: Listed[],
  seasons: Array<{ show: number; title: string; season: number; date: string }>,
  reviewed: Record<string, Reviewed>,
  today = new Date(),
): Candidate[] {
  const keys = new Set(
    works.map((w) =>
      w.tmdb.type === "movie"
        ? `movie/${w.tmdb.id}`
        : `tv/${w.tmdb.id}/season/${w.tmdb.season ?? 1}`,
    ),
  );
  const shows = new Set(works.filter((w) => w.tmdb.type === "tv").map((w) => w.tmdb.id));
  const candidates: Candidate[] = [];
  for (const { kind, id, title, date } of listed) {
    const key = `${kind}/${id}`;
    const known = kind === "movie" ? keys.has(key) : shows.has(id);
    if (!known) candidates.push({ key, title, date });
  }
  for (const { show, title, season, date } of seasons) {
    const key = `tv/${show}/season/${season}`;
    if (!keys.has(key)) candidates.push({ key, title: `${title} — Season ${season}`, date });
  }
  return candidates
    .filter((c) => {
      const seen = reviewed[c.key];
      const settled = seen && !(seen.untilDated && c.date);
      return !settled && isCandidateDate(c.date, today);
    })
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}
