# marvel-timeline

An interactive map of Marvel viewing order across the MCU, Fox X-Men, legacy Spider-Man, and the SSU. Pick a work to see what it builds on.

Static SPA built with Vite + React.

## Development

```sh
pnpm install
pnpm dev
```

## Data

Everything lives in `src/data/works.ts`: works, dependencies, release dates, and TMDB poster paths. Each work's `tmdb` id links to its themoviedb.org page, where the date and poster come from; edit them by hand.

## Scripts

| Command                     | Description                    |
| --------------------------- | ------------------------------ |
| `pnpm build`                | Typecheck and build to `dist/` |
| `pnpm test`                 | Layout unit tests              |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt                 |

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck, tests, and build on every push and PR.
