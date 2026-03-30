# Dependency Upgrade Plan

This plan turns dependency hygiene into a repeatable process with controlled risk.

## Baseline Commands

- `npm run deps:outdated` to inspect drift.
- `npm run deps:update:safe` for in-range patch/minor updates.
- Run `npm run lint`, `npm test`, `npm run test:e2e:smoke`, and `npm run build` after any update batch.

## Upgrade Phases

## Phase 1: Safe Drift Control (ongoing)

- Run `npm run deps:update:safe` regularly.
- Keep lockfile current and validated by full presubmit checks.

## Phase 2: Toolchain Major Bundle

Upgrade together in one branch:

- `vite` major
- `@vitejs/plugin-react` major
- `vitest` major

Why bundled: these packages have tight compatibility coupling.

## Phase 3: Styling Stack Major

- `tailwindcss` major (with config and utility migration review).

## Phase 4: Type System Major

- `typescript` major plus ecosystem checks (`typescript-eslint`, type-only imports, stricter diagnostics).

## Phase 5: Runtime/Test Ecosystem Majors

- `jsdom` major
- any remaining major dev-tool upgrades (`knip`, `lint-staged`, etc.) after compatibility checks.

## Execution Rules

- Upgrade one phase per PR.
- Capture before/after test timing and failure deltas.
- Document migration notes in `docs/ENGINEERING_AUDIT_2026-03.md`.
