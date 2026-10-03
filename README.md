# Marvel Timeline

An interactive map of Marvel viewing order across the MCU, Netflix's Defenders Saga, Fox X-Men, the pre-MCU films Deadpool & Wolverine brings back, legacy Spider-Man, the SSU, the Spider-Verse films, and X-Men '97. Pick a work to see what it builds on.

Static SPA built with Vite + React. Live at https://solclarus.github.io/marvel-timeline/.

## Using the map

- **Select** a poster to highlight what it builds on and what follows; the map zooms to fit them. **Search** (`/` or ⌘K / Ctrl+K) finds any work and reveals it if it's filtered out.
- **View mode** (top bar): recommended order, release date, or in-story chronology.
- **Films only** (top bar) hides series and bridges their chains, so a film that follows a series still links to the films before it.
- **Settings** (top bar): highlight all related works or direct ones only; group the map by franchise or by Earth; show or hide groups.
- **Hover** a group card or MCU phase (or tap its label) to focus it.
- **Navigate**: scroll or drag to pan, pinch (or ⌘/Ctrl + scroll) to zoom.

The view is kept in the URL (`work`, `mode`, `focus`, `group`, `show`, `media`), so any state can be shared as a link.

## Development

```sh
pnpm install
pnpm dev
```

## Data

Everything lives in `src/data/works.ts`: works, dependencies, Earths, release dates, and TMDB poster paths, edited by hand.

- `dependsOn` lists what a work builds on; `reference` edges are drawn but don't count as prerequisites.
- `earths` lists the Earths a work is set on or crosses into, home first (defaults to its franchise's Earth). `EARTH_META` cites where each Earth number comes from.
- Each work's `tmdb` id points at its themoviedb.org movie or TV season, the source of its date and poster. `TMDB_TOKEN=… pnpm check:tmdb` lists works that have drifted from TMDB.

## Scripts

| Command                     | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `pnpm build`                | Typecheck and build to `dist/`                      |
| `pnpm test`                 | Unit tests                                          |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt                                      |
| `pnpm check:tmdb`           | Compare dates and posters with TMDB (needs a token) |

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck, tests, and build on every push and PR, and deploys `main` to GitHub Pages.
