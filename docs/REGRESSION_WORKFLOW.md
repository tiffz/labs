# Visual and Audio Regression Workflow

This document defines the canonical workflow for screenshot and audio regression checks.

## Goals

- Catch unintended visual regressions across all Labs apps.
- Catch unintended deterministic audio output changes.
- Make diffs easy to review for both humans and agents.
- Keep intentional baseline updates explicit and reviewable.

## Test Coverage

### Visual Baselines

- Test file: `e2e/visual/apps.visual.spec.ts`
- Coverage:
  - Home (`/`)
  - All app routes (`/cats/`, `/zines/`, `/corp/`, `/drums/`, `/story/`, `/chords/`, `/forms/`, `/beat/`, `/words/`, `/pitch/`, `/piano/`, `/ui/`, `/drums/universal_tom/`)
  - Two major canonical states per route:
    - Desktop viewport baseline
    - Mobile viewport baseline
- Baselines live in: `e2e/visual/apps.visual.spec.ts-snapshots/`

### Audio Baselines

- Test file: `src/beat/utils/syntheticAudioGenerator.audio-regression.test.ts`
- Coverage:
  - Canonical deterministic synthetic audio fixtures
  - Strict SHA-256 hash matching over canonical Float32 PCM samples
- Baseline manifest:
  - `src/beat/regression/baselines/synthetic-audio.hashes.json`
- Latest run report (generated):
  - `src/beat/regression/reports/synthetic-audio.latest.json`

## Commands

### Visual

- Verify visual baselines:
  - `npm run test:e2e:visual`
- Update visual baselines (intentional changes only):
  - `npm run test:e2e:visual:update`
- **Full refresh (delete every baseline PNG, then regenerate all):**
  - `npm run test:e2e:visual:update:fresh`
  - Runs `scripts/refresh-visual-baselines.mjs`, which clears `e2e/visual/apps.visual.spec.ts-snapshots/*.png` and then invokes the same Playwright `--update-snapshots` run as `test:e2e:visual:update`.
  - Use when tooling, fonts, or wait helpers changed globally and you want every baseline rewritten from scratch. For a single route, prefer `npm run test:e2e:visual:update` with a Playwright `-g` filter, e.g. `npx playwright test --project=visual e2e/visual/apps.visual.spec.ts -g "cats desktop" --update-snapshots`.
- **Prerequisites:** From the repo root; Playwright will start Vite on `5173` via `playwright.config.ts` `webServer` (or reuse an existing dev server when not in CI). Do not rely on `vite preview` for `/__regression/*` UI.
- Optional cross-browser matrix (Chromium + Firefox + WebKit):
  - `npm run test:e2e:visual:crossbrowser`
- Update cross-browser baselines:
  - `npm run test:e2e:visual:crossbrowser:update`
- Open local Playwright report:
  - `npm run test:e2e:visual:report`

### Audio

- Verify audio hashes:
  - `npm run test:audio:regression`
- Update audio hash baselines (intentional changes only):
  - `npm run test:audio:regression:update`

### Combined Regression Check

- `npm run test:regression`

## UI Dashboard (Local)

Open `http://127.0.0.1:5173/ui/` and select the **Regression** tab to browse:

- **Screenshots** — one gallery for every baseline route: matching routes show the committed baseline only; when Playwright reports a diff, the same card shows **Baseline**, **Latest**, and **Diff** with timestamps.
- Multi-select **filter chips** for app, form factor (desktop/mobile), and platform suffix.
- **Report** — embedded Playwright HTML report when available.
- Latest visual run status from `test-results/.last-run.json`, plus audio drift summary.
- Per-diff actions: **Accept current as baseline**, **Report UI regression** (copies a structured LLM-oriented prompt to the clipboard), **Save rejection report to disk** (writes under `.regression-reports/`). When multiple failures exist, **Export batch summary for agents** generates a batch markdown report.

The dashboard reads local artifacts via dev-only endpoints under `/__regression/*` (not available under `vite preview`).

Primary header actions:

- **Regenerate baselines** — destructive confirmation; runs `npm run test:e2e:visual:update:fresh` (delete all PNGs in `e2e/visual/apps.visual.spec.ts-snapshots/`, then `--update-snapshots`).
- **Run screenshot tests** — `npm run test:e2e:visual`.
- **Run audio tests** — audio regression check.

Incremental baseline updates (without deleting the snapshot folder) are **CLI-only**: `npm run test:e2e:visual:update` (optionally with a Playwright `-g` filter for a single route).

Tab subroutes are hash-addressable for quick navigation:

- `http://127.0.0.1:5173/ui/#gallery`
- `http://127.0.0.1:5173/ui/#docs`
- `http://127.0.0.1:5173/ui/#theme`
- `http://127.0.0.1:5173/ui/#regression`
- `http://127.0.0.1:5173/ui/#regression/screenshots` (default when opening Regression)
- `http://127.0.0.1:5173/ui/#regression/report`
- `http://127.0.0.1:5173/ui/#regression/runner` — expands the runner log; section stays **Screenshots**

Legacy hashes `#regression/failures` and `#regression/baselines` are treated as **Screenshots** for backwards compatibility.

## Font/Icon Rendering Reliability in Visual Tests

Visual tests use local font assets for deterministic rendering:

- Material Symbols (icons)
- Material Icons (legacy icon class support)
- Roboto (UI text)
- Noto Music (notation symbols)

This avoids flaky external font loading while keeping screenshots representative of real UI rendering.

All app entry points initialize the shared icon runtime (`initMaterialIconRuntime()`), which:

- Self-hosts icon font assets via Fontsource packages (no per-app Google icon stylesheet links)
- Sets a consistent readiness class contract (`icons-pending` -> `icons-ready`)
- Preserves backward compatibility with existing `.fonts-loaded` selectors during migration

## Required Review Policy

Baseline updates are never "auto-approved". Every changed baseline must be reviewed.

### Agent default behavior

Agents must follow this sequence on any UI or audio-impacting change:

1. Run regression checks.
2. Review screenshot/audio diffs directly.
3. Keep clearly expected updates.
4. Escalate uncertain diffs to the user before finalizing.

Escalation is required when:

- A visual diff touches layout/spacing/typography outside expected scope.
- Many screens changed but the code change is small.
- Audio hash drift appears in fixtures unrelated to the edited area.
- The agent cannot confidently explain why a baseline changed.

### Human review behavior

- Review visual diffs in local Playwright report or CI artifacts.
- Review audio drift in the JSON report plus baseline hash changes.
- Approve only changes that are intentionally caused by the PR.

## CI Artifacts

CI uploads browseable artifacts for each run:

- `visual-regression-artifacts`
  - `playwright-report/**`
  - `test-results/**` (includes image diffs on failures)
- `audio-regression-report`
  - `src/beat/regression/reports/**`

Use these artifacts to inspect all screenshots and any drift without reproducing locally.
