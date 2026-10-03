// A work's running time from TMDB. Kept free of path aliases so
// `scripts/fetch-runtimes.ts` can import it under plain Node.
import type { WorkNode } from "../data/works.ts";

export interface Runtime {
  minutes: number;
  // Series seasons only.
  episodes?: number;
}

// The fields used from TMDB's /movie/{id} and /tv/{id}/season/{n} responses.
export interface TmdbRuntimeDetails {
  runtime?: number | null; // movies
  episodes?: Array<{ runtime?: number | null }>; // seasons
}

// Null until TMDB knows the whole thing: an unreleased film's runtime, or
// every episode's in a season.
export function runtimeOf(work: WorkNode, details: TmdbRuntimeDetails): Runtime | null {
  if (work.tmdb.type === "movie") {
    return details.runtime ? { minutes: details.runtime } : null;
  }
  const episodes = details.episodes ?? [];
  if (episodes.length === 0 || episodes.some((e) => !e.runtime)) return null;
  return {
    minutes: episodes.reduce((sum, e) => sum + (e.runtime ?? 0), 0),
    episodes: episodes.length,
  };
}
