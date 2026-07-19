# Dependency Upgrade Plan

This plan turns dependency hygiene into a repeatable process with controlled risk.

## Standing automation

- **Dependabot** (weekly, Monday): grouped minor/patch PRs for the root package, `workers/labs-session-bff`, and GitHub Actions. Majors are ignored — they land through the phases below.
- **Auto-merge**: `.github/workflows/dependabot-auto-merge.yml` arms squash auto-merge on Dependabot minor/patch PRs; branch protection on `main` (required `checks`/`build`/`vitest`/`e2e`) means they only land green.
- **Security fast lane** (weekly): `npm audit --omit=dev --audit-level=high` in `weekly-engineering-health.yml` fails the job and files a `security-audit` issue on high/critical advisories. `npm run audit:advisory` also runs (non-blocking) at the end of `presubmit:push`.
- **Node pin**: `.nvmrc` (Node 22) + `engines` in `package.json`; workflows read `node-version-file: '.nvmrc'` so local/CI stay aligned.

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

| Date       | Phase | Change                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-?? | —     | Initial `DEPENDENCY_UPGRADE_PLAN.md` created                                                                                                                                                                                                                                                               | See March 2026 engineering audit (archived) for context.                                                                                                                                                                                                                                                                                                                   |
| 2026-04-18 | 1     | `npm run deps:update:safe` applied; in-range patch/minor updates across dev + prod deps.                                                                                                                                                                                                                   | Full lockfile refresh (lint/typecheck/knip/test:fast all clean). Renamed `tailwind.config.js` → `tailwind.config.cjs` to unblock ESM loader after postcss/tailwind bump.                                                                                                                                                                                                   |
| 2026-04-18 | —     | Documented GH Actions pinning policy (first-party @tag, third-party @SHA).                                                                                                                                                                                                                                 | No third-party actions in use, so no SHA pins required today.                                                                                                                                                                                                                                                                                                              |
| 2026-07-19 | 2     | Toolchain major landed: vite 7.3.6→8.1.5, @vitejs/plugin-react 4.7→6.0, vitest 3.2.7→4.1.10, @vitest/coverage-v8 3→4, esbuild 0.27→0.28.1. Dropped `vite-plugin-static-copy` (replaced by a 10-line closeBundle copy plugin — v4's glob engine broke on `../` targets + glob metachars in checkout paths). | Migration notes: `defineConfig` now from `vitest/config` (vite 8 drops bundled vitest types); vitest 4 pool rework (`poolOptions.threads.maxThreads` → top-level `maxWorkers`); constructor mocks must use `function`/`class` (4 test files fixed). Timings ≈ parity: full vitest 108s (was ~110s), build ~55s (was ~60s). `npm audit`: 0 vulnerabilities after bundle.    |
| 2026-07-19 | 3     | Tailwind v3 → v4 (`tailwindcss` 4.3.3 + `@tailwindcss/postcss`). Six app sheets migrated to `@import "tailwindcss"` + `@config` (legacy JS config kept — custom fonts/colors unchanged). Template utility renames via official codemod (`shadow-sm`→`shadow-xs`, `bg-gradient-*`→`bg-linear-*`, etc.).     | Codemod caveats: it rewrote prose strings ("shadow entity"→"shadow-sm entity") and files in non-Tailwind apps — those were reverted; only the six Tailwind apps kept template changes. MUI selector rules had to move out of `@layer components` (v4 converts layer contents to `@utility`, which rejects non-utility names). `autoprefixer` kept for non-Tailwind sheets. |
| —          | 4     | TypeScript 5 → 6.                                                                                                                                                                                                                                                                                          | Deferred. Pair with `noUncheckedIndexedAccess` tightening noted in `tsconfig.json`.                                                                                                                                                                                                                                                                                        |
| —          | 5     | Remaining majors (jsdom, knip, lint-staged, react-hooks plugin, @mui/material, etc.).                                                                                                                                                                                                                      | Deferred.                                                                                                                                                                                                                                                                                                                                                                  |

## Deferred Majors (Snapshot at 2026-04-18)

For reference, the current known outstanding majors at the time of the Phase 1 sweep:

- `vite` 7 → 8, `@vitejs/plugin-react` 4 → 6, `vitest` 3 → 4, `@vitest/coverage-v8` 3 → 4 (Phase 2 bundle)
- `tailwindcss` 3 → 4 (Phase 3)
- `typescript` 5 → 6 (Phase 4)
- `jsdom` 26 → 28, `knip` 5 → 6, `lint-staged` 15 → 16, `eslint-plugin-react-hooks` 5 → 7, `eslint-plugin-react-refresh` 0.4 → 0.5, `rollup-plugin-visualizer` 6 → 7, `vite-plugin-static-copy` 3 → 4, `@mui/material` 7 → 9 (Phase 5)

Refresh this snapshot each time a phase PR is opened.
