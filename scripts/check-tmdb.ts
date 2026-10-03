// Lists works whose release date or poster differs from TMDB, so
// `src/data/works.ts` can be updated by hand. Needs a TMDB API read access
// token: TMDB_TOKEN=... pnpm check:tmdb
// Exits 1 when anything differs or a request fails. Works TMDB doesn't list
// yet (404, e.g. an announced season) are only noted.
import { WORKS } from "../src/data/works.ts";
import { diffWork, tmdbPath, type TmdbDetails, type WorkDiff } from "../src/lib/tmdb-diff.ts";

const token = process.env.TMDB_TOKEN;
if (!token) {
  console.error("Set TMDB_TOKEN to a TMDB API read access token (themoviedb.org/settings/api).");
  process.exit(2);
}

async function fetchDetails(path: string): Promise<TmdbDetails | null> {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()) as TmdbDetails;
}

const diffs: WorkDiff[] = [];
const failures: string[] = [];
const unlisted: string[] = [];
// A few at a time, well under TMDB's rate limit.
const BATCH = 8;
for (let i = 0; i < WORKS.length; i += BATCH) {
  await Promise.all(
    WORKS.slice(i, i + BATCH).map(async (work) => {
      try {
        const details = await fetchDetails(tmdbPath(work));
        if (details) diffs.push(...diffWork(work, details));
        else unlisted.push(`${work.id} (${tmdbPath(work)})`);
      } catch (error) {
        failures.push(`${work.id}: ${(error as Error).message}`);
      }
    }),
  );
}

for (const { id, field, ours, tmdb } of diffs.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`${id}  ${field}: ${ours} -> ${tmdb}`);
}
for (const id of unlisted.sort()) console.log(`not on TMDB yet  ${id}`);
for (const failure of failures) console.error(`failed  ${failure}`);
console.log(
  `\n${diffs.length} difference(s), ${failures.length} failure(s), ${unlisted.length} not on TMDB yet, ${WORKS.length} works`,
);
process.exit(diffs.length > 0 || failures.length > 0 ? 1 : 0);
