# Engineering Audit - 2026-03

This audit covers testing strategy, architecture/factoring quality, dependency health, and documentation quality across the Labs micro-app monorepo.

## Executive Findings

### P0

- E2E tests existed but were not executed in CI.
- Shared import boundary enforcement in CI was narrower than the real app set.
- Docs had no single source-of-truth precedence and included stale guidance.

### P1

- Docs/assets deploy path skipped automated test validation.
- Several tests use brittle timing patterns (`waitForTimeout`, real sleeps) and need gradual hardening.
- Shared boundary guardrails existed but did not enforce `src/shared/** -> src/<app>/**` bans in Vitest.

### P2

- Architecture consistency varies across app entrypoints (`main.tsx` patterns, logger setup, StrictMode usage).
- Large CSS files and large `App.tsx` files indicate refactor opportunities.

## Remediation Implemented In This Pass

- Added e2e smoke script in `package.json`.
- Hardened CI workflow:
  - widened shared import boundary regex to all app dirs
  - added Playwright browser install + e2e smoke run
- Hardened docs deploy workflow:
  - runs lint and fast tests before build/deploy
- Improved Playwright stability defaults:
  - retries in CI (`1`)
  - `trace: on-first-retry` in CI
- Reduced one e2e fixed-sleep pattern in `src/story/e2e/story-generation.spec.ts`.
- Extended `src/shared/importBoundaries.test.ts` to also forbid shared-to-app imports.
- Added docs precedence/canonical ownership document: `docs/SOURCE_OF_TRUTH.md`.
- Updated stale docs statements in `README.md`, `DEVELOPMENT.md`, and `GEMINI.md`.
- Updated stale React version mention in `src/drums/GEMINI.md`.
- Removed fixed-sleep e2e waits across cats/drums/forms/corp and replaced with condition-based assertions.
- Added missing smoke tests for `/`, `/ui/`, `/pitch/`, and `/words`.
- Consolidated duplicate beat downbeat/onset implementations onto shared source-of-truth modules through re-exports.
- Standardized server logger initialization in additional app entrypoints (`story`, `piano`, `pitch`, `ui`).

## Dependency Health Snapshot (`npm outdated --long`)

### Major upgrades needing planned migration (not auto-upgraded in this pass)

- `vite` `7.x -> 8.x`
- `vitest` `3.x -> 4.x`
- `@vitejs/plugin-react` `4.x -> 6.x`
- `tailwindcss` `3.x -> 4.x`
- `typescript` `5.x -> 6.x`
- `jsdom` `26.x -> 28.x`
- `lint-staged` `15.x -> 16.x`
- `knip` `5.x -> 6.x`
- `@likemybread/name-generator` `1.x -> 2.x`

### Recommended upgrade phases

1. **Now (low risk patch/minor):**
   - React/DOM patch updates, Playwright patch, ESLint patch, Prettier patch, PostCSS/Autoprefixer patch.
2. **Next (toolchain majors with compatibility pass):**
   - Vite 8 + plugin-react 6 + Vitest 4 together.
   - Knip 6 and lint-staged 16 after hook verification.
3. **Later (larger migration budget):**
   - Tailwind 4 migration, TypeScript 6 migration, jsdom 28 behavior verification.

See `docs/DEPENDENCY_UPGRADE_PLAN.md` for the execution sequence and validation checklist.

## Remaining High-ROI Work

- Replace remaining `page.waitForTimeout(...)` calls in e2e suites with condition-based waits.
- Add smoke e2e coverage for currently thin apps/routes (`/`, `/ui/`, `/pitch/`, `/words/`).
- Refactor oversized app shells into feature slices (`App.tsx` decomposition).
- Consolidate duplicated/shared audio-analysis code paths where shared and app-local logic diverge.

## 30/60/90 Plan

- **30 days:** Finish flaky-test hardening and smoke coverage gaps; align all docs to source-of-truth map.
- **60 days:** Execute Vite/Vitest toolchain major upgrade in one branch with compatibility fixes.
- **90 days:** Complete CSS and component factoring roadmap for biggest maintenance hotspots.
