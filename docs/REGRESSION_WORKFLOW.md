# Visual and Audio Regression Workflow

This document defines the canonical workflow for screenshot and audio regression checks.

## Goals

- Catch unintended visual regressions across all Labs apps.
- Catch unintended deterministic audio output changes.
- Make diffs easy to review for both humans and agents.
- Keep intentional baseline updates explicit and reviewable.

## Test Coverage

### App shell smokes (Playwright)

- Test file: `e2e/smoke/app-shells.spec.ts` (routes from [`e2e/routeRegistry.ts`](../e2e/routeRegistry.ts))
- **`e2e/smoke/encore-performance-routes.spec.ts`** — Encore `#/library` and `#/practice` hash routes + Practice tab navigation (performance list shell wiring)
- Includes **`/encore/`**, **`/stanza/`**, **`/agility/`** plus all other micro-apps
- Run: `npm run test:e2e:smoke`

### Playback UI smokes (Playwright)

- Test file: `e2e/playback-ui-regressions.spec.ts`
- **CI:** runs after smoke in `.github/workflows/ci.yml`
- Coverage (cheap integration checks, not full visual baselines):
  - Words — portaled chord sound menu uses `shared-playback-field-select__menu--words` (trigger + menu skin parity).
  - Encore Originals — inline drum mini notation highlight moves during chord chart playback.
  - Encore Originals — reload existing song shows loading spinner, not a “Song not found” flash.
- Run: `npx playwright test e2e/playback-ui-regressions.spec.ts`

Add a smoke here when a cross-app playback/portal/empty-state bug recurs — prefer DOM/class assertions over screenshot baselines.

### Visual Baselines

- Test file: `e2e/visual/apps.visual.spec.ts`
- Coverage (declared in [`e2e/routeRegistry.ts`](../e2e/routeRegistry.ts)):
  - Routes where `visual: true`, including seeded **`visualStates`** (per-app CUJ states, e.g. `?e2eSeed=1` fixtures) beyond the empty shell
  - Viewports per route: **desktop** 1440x900 + **mobile** 390x844 everywhere; **tablet** 768x1024 for layout-sensitive routes (stanza, encore, gesture, zinebox)
  - Per-route `mask` selectors hide genuinely dynamic regions; Muscle is excluded (continuous WebGL rendering — see registry comment)
- Determinism: frozen `Date`, `TZ=UTC`, `reducedMotion: 'reduce'`, local fonts, animation kill (see `e2e/visual/visualTestUtils.ts`)
- Baselines live in: `e2e/visual/apps.visual.spec.ts-snapshots/` (**Linux CI is canonical**)

**Labs homepage catalog:** Adding, removing, or reordering apps in `src/labsHome/labsCatalog.manifest.json` changes the `/` route height and tile grid. After `npm run generate:labs-catalog`, refresh `home-desktop.png` and `home-mobile.png` (import Linux CI actuals when possible). Nightly `Run visual regression baselines` fails on drift; in `ci.yml`, **scoped diffs run scoped visual blocking** and cross-cutting diffs run full visual advisory.

### Audio Baselines

- Test file: `src/shared/beat/regression/syntheticAudioGenerator.audio-regression.test.ts`
- Coverage:
  - Canonical deterministic synthetic audio fixtures
  - Strict SHA-256 hash matching over canonical Float32 PCM samples
- Baseline manifest:
  - `src/shared/beat/regression/baselines/synthetic-audio.hashes.json`
- Latest run report (generated):
  - `src/shared/beat/regression/reports/synthetic-audio.latest.json`

## Commands

### Visual

- Verify visual baselines:
  - `npm run test:e2e:visual`
- Verify only the routes for apps changed vs a base ref (what scoped CI runs):
  - `npm run test:e2e:visual:scoped` (wraps `scripts/run-scoped-visual.mts`)
- Run visual tests in a Linux container locally (pixel-identical to CI; requires Docker):
  - `npm run test:e2e:visual:docker` (append `--update-snapshots` to regenerate canonical baselines locally)
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

Agents must follow [`docs/VISUAL_REGRESSION_AGENT.md`](VISUAL_REGRESSION_AGENT.md) and skill `labs-visual-regression`; classify every diff against [`VISUAL_JUDGE_RUBRIC.md`](VISUAL_JUDGE_RUBRIC.md) (skill `labs-visual-judge`). Summary:

1. Run or download regression artifacts when CI warns or shared UI changed.
2. Review screenshot/audio diffs directly (actual, expected, diff — not blind updates).
3. Update baselines from **Linux CI actuals** when diffs are expected; use `scripts/import-visual-baselines-from-artifacts.mjs`.
4. Escalate uncertain diffs, error banners, or multi-app drift without a shared-layer explanation.

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
  - `src/shared/beat/regression/reports/**`

Use these artifacts to inspect all screenshots and any drift without reproducing locally.

## Bug-fix handoff (playback / notation / portal UI)

When fixing user-visible playback, notation, portal, or async-load bugs, record in the PR (see [`.github/pull_request_template.md`](../.github/pull_request_template.md)):

| Field                     | Purpose                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **User-visible symptom**  | What the user saw (e.g. highlight stuck on beat 1).                                                              |
| **Root cause class**      | One of: `stale state` · `portal styling` · `render order` · `async race` · `empty-state logic` · `fake stopAll`. |
| **Regression test added** | Vitest or Playwright file that would fail if the bug returns.                                                    |

This makes the next similar bug searchable and helps agents pick the right fix class faster. Canonical patterns live in [`src/shared/hooks/PLAYBACK_HOOK_PATTERN.md`](../src/shared/hooks/PLAYBACK_HOOK_PATTERN.md) and [`src/shared/music/PLAYBACK_RENDERING_AUDIT.md`](../src/shared/music/PLAYBACK_RENDERING_AUDIT.md).

## Session retrospectives

After substantial agent or human sessions, review friction and codify durable fixes. Workflow: [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md). Handoff types: [`AGENTS.md`](../AGENTS.md) § Handoff types. Record what landed in the PR **Process improvements** table when applicable.
