# Dependency Upgrade Plan

This plan turns dependency hygiene into a repeatable process with controlled risk.

## Baseline Commands

- `npm run deps:outdated` — inspect drift.
- `npm run deps:update:safe` — in-range patch/minor updates via `npm update`.
- After any update batch, run: `npm run lint && npm run typecheck && npm run knip && npm run test:fast && npm run test:e2e:smoke && npm run build`.

## Upgrade Phases

### Phase 1: Safe Drift Control (ongoing)

- Run `npm run deps:update:safe` on a regular cadence (at minimum once per release cycle).
- Keep the lockfile current and validated by full presubmit checks.
- No SemVer-major moves in this phase.

### Phase 2: Toolchain Major Bundle

Upgrade together in one branch:

- `vite` major
- `@vitejs/plugin-react` major
- `vitest` major
- `@vitest/coverage-v8` major (couples to vitest)

Why bundled: these packages have tight compatibility coupling.

### Phase 3: Styling Stack Major

- `tailwindcss` v3 → v4 (config rewrite + utility migration review).
- Track side effects on `autoprefixer`, `postcss`, and `material-symbols` in the same PR.

### Phase 4: Type System Major

- `typescript` major plus ecosystem checks (`typescript-eslint`, type-only imports, stricter diagnostics).

### Phase 5: Runtime/Test Ecosystem Majors

- `jsdom` major
- `knip` major, `lint-staged` major, `eslint-plugin-react-hooks` major, `eslint-plugin-react-refresh` major, `rollup-plugin-visualizer` major, `vite-plugin-static-copy` major, `@mui/material` major.
- Order by blast radius; do `knip` first (dev-only) and `@mui/material` last.

### Execution Rules

- Upgrade one phase per PR.
- Capture before/after test timing and failure deltas in the PR description.
- Any breaking API change lands with a migration note in the touching app's README/ARCHITECTURE.md.

## GitHub Actions Pinning Policy

- **First-party actions** (`actions/*`): pin to the **major version tag** (e.g. `@v5`). GitHub maintains these and backports security fixes across the major.
- **Third-party actions**: pin to a **full commit SHA** plus a comment recording the tag at pin time. Re-bump SHAs on a quarterly cadence.
- All action pins live in `.github/workflows/*.yml` and are audited whenever a workflow is edited.

Current inventory (2026-04-18): every action in use is first-party (`actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, `actions/upload-artifact`). No SHA pins required today; revisit if a third-party action is added.

## Upgrade Tracking Table

Update this table whenever a phase PR lands or a non-trivial in-range bump occurs.

| Date       | Phase | Change                                                                                     | Notes                                                                                                                                                                    |
| ---------- | ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-?? | —     | Initial `DEPENDENCY_UPGRADE_PLAN.md` created                                               | See March 2026 engineering audit (archived) for context.                                                                                                                 |
| 2026-04-18 | 1     | `npm run deps:update:safe` applied; in-range patch/minor updates across dev + prod deps.   | Full lockfile refresh (lint/typecheck/knip/test:fast all clean). Renamed `tailwind.config.js` → `tailwind.config.cjs` to unblock ESM loader after postcss/tailwind bump. |
| 2026-04-18 | —     | Documented GH Actions pinning policy (first-party @tag, third-party @SHA).                 | No third-party actions in use, so no SHA pins required today.                                                                                                            |
| —          | 2     | Toolchain major (vite 7→8, @vitejs/plugin-react 4→6, vitest 3→4, @vitest/coverage-v8 3→4). | Deferred. Open: vite 8 config review, vitest 4 migration notes.                                                                                                          |
| —          | 3     | Tailwind v3 → v4.                                                                          | Deferred. Largest blast radius; coordinate with CSS `!important` audit.                                                                                                  |
| —          | 4     | TypeScript 5 → 6.                                                                          | Deferred. Pair with `noUncheckedIndexedAccess` tightening noted in `tsconfig.json`.                                                                                      |
| —          | 5     | Remaining majors (jsdom, knip, lint-staged, react-hooks plugin, @mui/material, etc.).      | Deferred.                                                                                                                                                                |

## Deferred Majors (Snapshot at 2026-04-18)

For reference, the current known outstanding majors at the time of the Phase 1 sweep:

- `vite` 7 → 8, `@vitejs/plugin-react` 4 → 6, `vitest` 3 → 4, `@vitest/coverage-v8` 3 → 4 (Phase 2 bundle)
- `tailwindcss` 3 → 4 (Phase 3)
- `typescript` 5 → 6 (Phase 4)
- `jsdom` 26 → 28, `knip` 5 → 6, `lint-staged` 15 → 16, `eslint-plugin-react-hooks` 5 → 7, `eslint-plugin-react-refresh` 0.4 → 0.5, `rollup-plugin-visualizer` 6 → 7, `vite-plugin-static-copy` 3 → 4, `@mui/material` 7 → 9 (Phase 5)

Refresh this snapshot each time a phase PR is opened.
