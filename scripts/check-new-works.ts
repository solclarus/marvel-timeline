// Lists Marvel Studios works and seasons on TMDB, out recently or coming,
// that are neither on the map nor in `src/data/reviewed-on-tmdb.ts`. Needs a
// TMDB API read access token: TMDB_TOKEN=... pnpm check:new
// Exits 1 when there's anything to look at.
import { REVIEWED } from "../src/data/reviewed-on-tmdb.ts";
import { WORKS } from "../src/data/works.ts";
import { newWorks, type Listed } from "../src/lib/new-works.ts";

const token = process.env.TMDB_TOKEN;
if (!token) {
  console.error("Set TMDB_TOKEN to a TMDB API read access token (themoviedb.org/settings/api).");
  process.exit(2);
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

const MARVEL_STUDIOS = 420;

interface Page {
  total_pages: number;
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
  }>;
}

const listed: Listed[] = [];
for (const kind of ["movie", "tv"] as const) {
  for (let page = 1; ; page++) {
    const data = await get<Page>(`/discover/${kind}?with_companies=${MARVEL_STUDIOS}&page=${page}`);
    for (const r of data.results) {
      listed.push({
        kind,
        id: r.id,
        title: r.title ?? r.name ?? "",
        date: r.release_date ?? r.first_air_date ?? "",
      });
    }
    if (page >= data.total_pages) break;
  }
}

// Seasons past the last one on the map, for every show on it.
const shows = [...new Set(WORKS.filter((w) => w.tmdb.type === "tv").map((w) => w.tmdb.id))];
const seasons = (
  await Promise.all(
    shows.map(async (show) => {
      const data = await get<{
        name: string;
        seasons?: Array<{ season_number: number; air_date: string | null }>;
      }>(`/tv/${show}`);
      return (data.seasons ?? [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({ show, title: data.name, season: s.season_number, date: s.air_date ?? "" }));
    }),
  )
).flat();

const candidates = newWorks(WORKS, listed, seasons, REVIEWED);
for (const { key, title, date } of candidates) {
  console.log(`${date || "no date"}  ${title}  (${key})`);
}
console.log(`\n${candidates.length} to look at`);
process.exit(candidates.length > 0 ? 1 : 0);
