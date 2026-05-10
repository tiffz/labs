# Labs Monorepo

React + TypeScript + Vite monorepo for multiple independent micro-apps under `src/<app>/`, with shared code in `src/shared`.

## Quick Start

```sh
npm install
npm run dev
```

- Main index: `http://127.0.0.1:5173/` (Vite dev defaults to IPv4 loopback so Encore/Spotify OAuth match without switching hosts.)
- Shared UI/docs workspace: `http://127.0.0.1:5173/ui/`
- App routes are normalized to canonical trailing-slash URLs (`/words` redirects to `/words/`).

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
npm run typecheck
npm run build
npm run knip
```

Regression commands:

```sh
npm run test:regression
npm run test:e2e:visual
npm run test:audio:regression
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

## Labs homepage catalog

The Music, Art & Writing, and Games grids on the static Labs homepage (`src/index.html`) are generated from a single manifest (still **plain HTML** in the repo — no React on the landing page):

- Manifest: `src/labsHome/labsCatalog.manifest.json`
- Generator: `scripts/render-labs-catalog.mjs`
- Markers in `src/index.html`: `<!-- labs-catalog:generated:start -->` … `<!-- labs-catalog:generated:end -->`

Commands:

```sh
npm run generate:labs-catalog
npm run check:labs-catalog
```

Within each column, apps are ordered **stable → experimental → unlisted**, with ties broken by manifest order. Per-app shells (`src/<app>/index.html`) stay hand-authored for critical CSS, theme-color, and cookie consent.

Notes:

- `npm run dev`, `npm run lint`, `npm test`, and `npm run build` all regenerate the shared UI catalog and Labs homepage catalog automatically.
- CI regenerates the shared catalog before lint; the Labs homepage catalog is checked with `check:labs-catalog` so a stale `src/index.html` fails the build.
- Git hooks also enforce freshness:
  - `pre-commit` regenerates and stages `src/ui/generatedSharedCatalog.ts` automatically.
  - `pre-push` warns (non-blocking) if catalog drift is detected.

## Development Rules (Short Version)

- Keep app-specific logic in `src/<app>/`.
- Reuse `src/shared/**` before creating new app-local primitives.
- Prefer Material/MUI interaction primitives for complex widgets.
- Keep shared-layer boundaries clean (`src/shared/**` must not depend on app folders).
- Follow docs precedence in `docs/SOURCE_OF_TRUTH.md` when guidance conflicts.
- When adding or reorganizing documentation, follow `docs/DOCUMENTATION_STRATEGY.md` (canonical homes, no duplication).
- Material cross-cutting architecture decisions: see `docs/adr/README.md` (ADRs complement `DEVELOPMENT.md`).

## Responsive Checklist (Music Apps)

Use this quick checklist before merging music UI changes:

- Validate at `360px`, `390px`, `768px`, and `1024px` widths.
- Confirm no horizontal page scroll on primary screens.
- Ensure primary controls are touch-friendly (target size ~`44px`).
- Verify popovers/dropdowns clamp to viewport width on mobile.
- Check sticky controls/header behavior while scrolling long content.
- Smoke-test playback/edit flows on phone-sized viewport before merge.

## CI/CD

Workflows:

- `.github/workflows/ci.yml`: code quality checks, tests, build, deploy.
- `.github/workflows/deploy-docs.yml`: docs/assets deployment path with lint, fast tests, and build.
- `.github/workflows/rollback.yml`: manual production rollback by known-good commit SHA.

For ADR-level guidance and architecture rationale, see `DEVELOPMENT.md`.
For documentation precedence and canonical sources, see `docs/SOURCE_OF_TRUTH.md`.
For rollback operations, see `docs/ROLLBACK.md`.
For visual/audio baseline and review workflow, see `docs/REGRESSION_WORKFLOW.md`.
To replace all screenshot baselines at once: `npm run test:e2e:visual:update:fresh`.
The local Regression UI lives under `http://127.0.0.1:5173/ui/#regression/screenshots` (dev server only; see that doc for actions and hashes).
