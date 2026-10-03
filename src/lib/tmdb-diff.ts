// Compares a work's hand-kept release date and poster with TMDB's. Kept free
// of path aliases so `scripts/check-tmdb.ts` can import it under plain Node.
import type { WorkNode } from "../data/works.ts";

// The fields used from TMDB's /movie/{id} and /tv/{id}/season/{n} responses.
export interface TmdbDetails {
  release_date?: string | null; // movies
  air_date?: string | null; // seasons
  poster_path?: string | null;
}

export interface WorkDiff {
  id: string;
  field: "releaseDate" | "poster";
  ours: string;
  tmdb: string;
}

export function tmdbPath(work: WorkNode): string {
  const { type, id, season } = work.tmdb;
  return type === "movie" ? `/movie/${id}` : `/tv/${id}/season/${season ?? 1}`;
}

// An empty TMDB value (not yet listed) isn't a mismatch: there's nothing to
// update to.
export function diffWork(work: WorkNode, details: TmdbDetails): WorkDiff[] {
  const diffs: WorkDiff[] = [];
  const date = (work.tmdb.type === "movie" ? details.release_date : details.air_date) ?? "";
  if (date && date !== work.releaseDate) {
    diffs.push({ id: work.id, field: "releaseDate", ours: work.releaseDate, tmdb: date });
  }
  const poster = details.poster_path ?? "";
  if (poster && poster !== work.poster) {
    diffs.push({ id: work.id, field: "poster", ours: work.poster, tmdb: poster });
  }
  return diffs;
}
