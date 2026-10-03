# Marvel Timeline

An interactive map of Marvel viewing order across the MCU, Netflix's Defenders Saga, Fox X-Men, the pre-MCU films Deadpool & Wolverine brings back, legacy Spider-Man, the SSU, the Spider-Verse films, and X-Men '97. Pick a work to see what it builds on.

Static SPA built with Vite + React. Live at https://solclarus.github.io/marvel-timeline/.

## Using the map

- **Select** a poster to highlight what it builds on and what follows; the map zooms to fit them. **Search** (`/` or ⌘K / Ctrl+K) finds any work and reveals it if it's filtered out.
- **Routes** (bottom bar): short themed paths (straight to Avengers: Doomsday, the MCU's Spider-Man, Fox's X-Men, the Defenders Saga) in watch order, with their total running time; pick a work to jump to it on the map.
- **View mode** (bottom bar): recommended order, release date, or in-story chronology.
- **Settings** (bottom bar), in two parts:
  - **Filter**: films, live-action series and animation, each on or off (hidden works are bridged, so a film that follows a series still links to the films before it); group by franchise or by Earth; tap a group chip to show or hide it, long-press or right-click to show only that one. A dot on the button means a filter is on.
  - **Display**: highlight all related works or direct ones only; language.
- **Hover** a group card or MCU phase (or tap its label) to focus it.
- **Navigate**: scroll or drag to pan, pinch (or ⌘/Ctrl + scroll) to zoom.
- **Language**: English or Japanese (Settings → Display → Language); the first visit follows the browser, later visits remember the choice. Both English and Japanese titles are searchable.

The view is kept in the URL (`work`, `mode`, `focus`, `group`, `show`, `media`), so any state can be shared as a link.

## Development

```sh
pnpm install
pnpm dev
```

## Data

Everything lives in `src/data/works.ts`: works, dependencies, Earths, release dates, and TMDB poster paths, edited by hand.

- `dependsOn` lists what a work builds on; `reference` edges are drawn but don't count as prerequisites.
- `animated: true` marks animated films and series, which the media filter treats as animation rather than films or series.
- Routes live in `src/data/routes.ts`: a list of works, or a goal whose direct prerequisites are taken; the app orders them.
- Running times are in `src/data/runtimes.ts`, generated from TMDB by `pnpm fetch:runtimes` (works without a full runtime yet are left out).
- `releaseMonthOnly: true` marks works announced only to the month.
- `titleJa` is the Japanese title (TMDB's ja-JP listing, lightly cleaned up). `earths` lists the Earths a work is set on or crosses into, home first (defaults to its franchise's Earth). `EARTH_META` cites where each Earth number comes from.
- Each work's `tmdb` id points at its themoviedb.org movie or TV season, the source of its date and poster. `TMDB_TOKEN=… pnpm check:tmdb` lists works that have drifted from TMDB. Both TMDB scripts also read `TMDB_TOKEN` from an ignored `.env.local`.

## Scripts

| Command                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `pnpm build`                | Typecheck and build to `dist/`                          |
| `pnpm test`                 | Unit tests                                              |
| `pnpm test:e2e`             | Browser tests against the production build (Playwright) |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt                                          |
| `pnpm check:tmdb`           | Compare dates and posters with TMDB (needs a token)     |
| `pnpm fetch:runtimes`       | Regenerate running times from TMDB (needs a token)      |

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck, unit tests, build, and the Playwright tests on every push and PR, and deploys `main` to GitHub Pages once both pass. Locally, `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` uses an installed Chrome instead of downloading one.

## License & credits

Source code: [MIT](LICENSE). The license doesn't extend to film and series titles, characters, logos, or posters, which belong to their owners; this is an unofficial fan project, not affiliated with Marvel, Disney, Sony Pictures, Netflix, or 20th Century Studios.

Release dates and posters come from [TMDB](https://www.themoviedb.org/). This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. The same notices are shown in the app's About dialog.
