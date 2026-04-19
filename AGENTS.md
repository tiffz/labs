# AGENTS.md

Instructions for AI coding assistants working in this repo (Cursor, Claude, Codex, Gemini, etc.). This is the modern universal convention; `GEMINI.md` is kept for backwards compatibility but defers to this file.

## Start Here

1. `README.md` — repo layout and quick start.
2. `DEVELOPMENT.md` — architecture decisions, guardrails, and policy. **This is the authoritative policy document.**
3. `STYLE_GUIDE.md` — TypeScript + UI/a11y conventions.
4. `docs/SOURCE_OF_TRUTH.md` — precedence map when docs disagree.
5. `.cursor/rules/*.mdc` — machine-enforced rules (pre-commit checks, app-entry-html, spa-css-conventions, react-a11y).

## Canonical Rules

- **Pre-commit checks** (`.cursor/rules/pre-commit-checks.mdc`): run ESLint, `npm run typecheck`, and `npm run knip` on changed files before declaring a task done.
- **SPA guardrails** (`src/shared/spaGuardrails.test.ts`): every app in `src/*/` must follow the shared shell template (`src/shared/templates/app-index.starter.html`), render under `React.StrictMode`, and expose `SkipToMain`. Tests will fail the build if you add a new app that skips these.
- **Import boundaries** (`src/shared/importBoundaries.test.ts` + `scripts/check-import-boundaries.mjs`): apps may import from `src/shared/**` but not from each other. Keep cross-app reuse in `src/shared/` and register new app directories in both files.
- **Shared UI first** (`src/shared/SHARED_UI_CONVENTIONS.md`): reach for `src/shared/components/` primitives before writing a new popover/tooltip/menu. MUI is the underlying primitive library for complex widgets.

## Repo Map

```text
src/
  <app>/                   # one directory per micro-app, with its own index.html + main.tsx
    README.md              # human-readable overview (every app has one)
    ARCHITECTURE.md|DEVELOPMENT.md  # (where applicable) architecture notes
  shared/                  # cross-app components, music/audio/playback/rhythm utilities
  ui/                      # internal shared-UI catalog / demo workspace
docs/
  COMPONENT_DECOMPOSITION_PATTERN.md
  CSS_IMPORTANT_AUDIT.md
  DEPENDENCY_UPGRADE_PLAN.md
  ENGINEERING_AUDIT_2026-03.md    # archived; current plan lives in active PRs
  REGRESSION_WORKFLOW.md
  ROLLBACK.md
  SOURCE_OF_TRUTH.md
e2e/                       # Playwright smoke and visual specs
scripts/                   # build-time helpers and boundary checks
.github/workflows/         # CI + deploy
```

Each app under `src/<app>/` has a `README.md`. Start there when working in an unfamiliar app.

## Commands You Should Actually Run

```bash
npm run dev            # vite dev server
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run knip           # dead-code / unused-exports check
npm run test:fast      # vitest, fast subset used by pre-commit
npm run test           # full vitest suite (longer; CI gate)
npm run build          # production build
npx playwright test    # E2E (requires `npx playwright install` first)
```

## Editing Checklist

Before declaring a task done:

- [ ] ESLint clean on changed files
- [ ] `npm run typecheck` clean
- [ ] `npm run knip` clean (delete any files/exports your change made unused)
- [ ] Any new shared primitive is documented in `src/shared/SHARED_UI_CONVENTIONS.md` and demoed under `/ui/`
- [ ] Any new app directory is added to `src/shared/importBoundaries.test.ts` and `scripts/check-import-boundaries.mjs`
- [ ] Visual baselines updated intentionally, not silently (`e2e/visual/*`)

## Large Refactors

See `docs/COMPONENT_DECOMPOSITION_PATTERN.md` for the repeatable pattern used to split oversized components and modules. Follow it rather than inventing a new structure.

## Do Not

- Do not add cross-app imports (`src/<app-a>/...` importing from `src/<app-b>/...`).
- Do not disable guardrail tests to make a refactor easier; fix the refactor instead.
- Do not silently regenerate `e2e/visual/*-snapshots/` without reviewing the diff.
- Do not add new uses of `!important` in CSS; see `docs/CSS_IMPORTANT_AUDIT.md`.
