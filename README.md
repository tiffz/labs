# Labs Monorepo

React + TypeScript + Vite monorepo for multiple independent micro-apps under `src/<app>/`, with shared code in `src/shared`.

## Quick Start

```sh
npm install
npm run dev
```

- Main index: `http://localhost:5173/`
- Shared UI/docs workspace: `http://localhost:5173/ui/`

## Repo Layout

```text
src/
  <app>/                 # app-local code (beat, chords, drums, piano, words, etc.)
  shared/                # shared components, music/audio/playback/rhythm utilities
  ui/                    # internal shared catalog + demo workspace
public/                  # static assets
.github/workflows/       # CI + deployment workflows
```

## Core Commands

```sh
npm run dev
npm test
npm run lint
npm run build
npm run knip
```

## Shared Catalog Workflow

The shared catalog is generated (not hand-maintained):

- Generator: `scripts/generate-shared-catalog.mjs`
- Config: `src/ui/sharedCatalog.config.json`
- Output: `src/ui/generatedSharedCatalog.ts`

Commands:

```sh
npm run generate:shared-catalog
npm run check:shared-catalog
```

Notes:

- `npm run dev` and `npm run build` run catalog generation automatically.
- CI also enforces catalog freshness with `npm run check:shared-catalog`.

## Development Rules (Short Version)

- Keep app-specific logic in `src/<app>/`.
- Reuse `src/shared/**` before creating new app-local primitives.
- Prefer Material/MUI interaction primitives for complex widgets.
- Keep shared-layer boundaries clean (`src/shared/**` must not depend on app folders).

## CI/CD

Workflows:

- `.github/workflows/ci.yml`: code quality checks, tests, build, deploy.
- `.github/workflows/deploy-docs.yml`: optimized docs/assets deployment path.

For ADR-level guidance and architecture rationale, see `DEVELOPMENT.md`.
