# CI reliability (GitHub Actions)

How Labs keeps [GitHub Actions](https://github.com/tiffz/labs/actions) green and what to do when it flakes. Solo dev: **CI is the review gate** — see [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md).

## Workflow map

| Workflow                      | Triggers                                          | Blocking?            | Deploys Pages?                                                  |
| ----------------------------- | ------------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| **`CI/CD`** (`ci.yml`)        | Push/PR when code, docs, config, or assets change | **Yes** — merge gate | **Yes** — `deploy` job on `main` push only, after `test` passes |
| **`Nightly Portfolio Audit`** | Schedule + manual                                 | No — early warning   | No                                                              |
| **`Rollback`**                | Manual                                            | N/A                  | Redeploy older SHA                                              |

## Merge gate (what must be green)

On PRs and `main`, `CI/CD` runs **parallel jobs** (each with `timeout-minutes` so hangs fail fast); `deploy` needs all of them:

| Job          | Contents                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`scope`**  | Diff detection (beat files, e2e mode, vitest mode) consumed by downstream jobs                                                                         |
| **`checks`** | Guardrail contracts (import boundaries, agent-docs, doc-links, ui-copy, css-important, catalogs, workflows), lint, typecheck, knip                     |
| **`vitest`** | Scoped (`run-changed-app-tests.mjs`) or full `npm test` per `scope`, with **one retry** in CI for rare worker teardown flakes; audio regression report |
| **`e2e`**    | Smoke (scoped or full per `scope`) + playback UI regressions + visual (see below); Playwright browsers cached by version                               |
| **`build`**  | Production build (artifact reused by `deploy` — no second compile on `main`) + advisory bundle report                                                  |

**Visual regression:** **scoped diffs are blocking** — `run-scoped-visual.mts` runs the changed apps' visual routes and fails the job on mismatch (classify per `docs/VISUAL_JUDGE_RUBRIC.md`, skill `labs-visual-judge`). **Cross-cutting/full diffs stay advisory** (warning + artifacts, job green) until ~2 weeks of clean nightly visual runs, then flip to blocking. Full visual matrix, **coverage**, and **Lighthouse** run **nightly** (`Nightly Portfolio Audit`).

## Pages deployment (single path)

Only **`ci.yml` → `deploy`** automatically calls `actions/deploy-pages` on push to `main`.

- **`rollback.yml`** also deploys Pages, but only via manual **`workflow_dispatch`** — it shares the same `pages-deploy-${{ github.ref }}` concurrency group so rollback and CI deploy cannot race.
- **`concurrency`** group `pages-deploy-${{ github.ref }}` with `cancel-in-progress: true` — rapid pushes cancel stale deploys; only latest `main` publishes.
- **`deploy` job** depends on `checks`, `vitest`, `e2e`, and `build`; it waits 90s / 120s and retries `actions/deploy-pages` up to **three** times when an attempt fails (typical errors: `in progress deployment`, GitHub `Deployment failed, try again later`).
- Presubmit guard **`npm run check:workflows`** fails if more than one **automatic** workflow invokes `deploy-pages` (rollback excluded).

Do **not** add a second Pages deploy workflow. Doc/asset path changes are covered by `ci.yml` path filters (`**.md`, images, `CNAME`, `LICENSE`, `public/**`).

## CI run cancellation

`ci.yml` uses workflow concurrency (`ci-${{ github.ref }}`, `cancel-in-progress: true`) so a newer push on the same branch cancels an outdated in-flight run — saves minutes and avoids confusing red runs on superseded commits.

## Changing workflows safely

Before merging edits under `.github/workflows/`:

1. Run **`npm run check:workflows`** (also in presubmit when workflow files change).
2. Run **`npm run presubmit`** locally.
3. Open a PR; confirm **`test`** is green before merge.
4. After merge to `main`, confirm **`deploy`** on the latest run succeeded (not an older cancelled run).
5. If deploy failed with Pages race, confirm the inline retry step ran or re-run the deploy job manually.

Skill: **`labs-babysit-pr`**. When adding checks, prefer extending the matching `ci.yml` job (`checks` / `vitest` / `e2e` / `build`) over new workflows unless there is a strong isolation reason (see nightly flakiness).

## Failure triage

| Symptom                                                         | Likely cause                                                                                                   | Fix                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `in progress deployment` on **deploy**                          | Two deploys raced (historical) or external Pages activity                                                      | Deploy job auto-retries after 90s / 120s; confirm single deploy path                                                                                                                                                                         |
| `Deployment failed, try again later` on **deploy**              | Transient GitHub Pages API flake (both attempts can fail within seconds)                                       | Push a new commit or re-run the **entire** workflow — not `--failed` deploy-only (see next row)                                                                                                                                              |
| `Multiple artifacts named "github-pages"` on deploy re-run      | Re-running **only** the failed `deploy` job in the same workflow run uploads a second Pages artifact           | Re-run the full workflow (`gh run rerun <id>`) or push a new commit; do **not** use `gh run rerun <id> --failed` for deploy-only recovery                                                                                                    |
| Gesture collections scroll perf flake (50.1ms on 50ms budget)   | Scroll perf helper counted intentional `stepDelayMs` pacing in frame samples                                   | Fixed measurement; budget later made **advisory** (`reportGestureCollectionsScrollBudget`) — frame timing on CI is runner-dominated, deterministic `toHaveCount` is the gate                                                                 |
| Knip / lint / typecheck failed                                  | Real regression                                                                                                | Fix code                                                                                                                                                                                                                                     |
| Vitest timeout at 10s on lazy-import test                       | `findBy*` timeout > `testTimeout`                                                                              | Preload in `beforeAll`; raise `it` timeout — see `docs/FLAKY_TESTS.md`                                                                                                                                                                       |
| Story `App.test.tsx` flake on CI                                | Same — cold dynamic imports vs 10s cap                                                                         | Fixed via preload + explicit test timeout                                                                                                                                                                                                    |
| E2e smoke parse error                                           | Syntax error in imported TS                                                                                    | Fix source; run smoke locally                                                                                                                                                                                                                |
| Visual step warning, job green                                  | Expected — visual is advisory on **cross-cutting** diffs (scoped diffs block)                                  | Inspect artifact; classify per `docs/VISUAL_JUDGE_RUBRIC.md`; update baselines intentionally or fix                                                                                                                                          |
| Scoped visual step failed the `e2e` job                         | Changed app's routes drifted from Linux baselines                                                              | Skill `labs-visual-judge`: fix must-fix rows, or import intentional actuals via `scripts/import-visual-baselines-from-artifacts.mjs`                                                                                                         |
| Workflow red after push but newer push exists                   | Cancelled superseded run (GitHub shows red)                                                                    | Check **latest** run on branch — not cancelled rows; older commit rows stay red even after a later green deploy                                                                                                                              |
| `ci:watch` exits `could not resolve PR` on `main` push          | Watcher only accepted PR numbers; direct `main` pushes have no PR                                              | `npm run ci:watch -- main` or pass the workflow run id (`npm run ci:watch -- <run-id>`)                                                                                                                                                      |
| Playwright flake masked by retry                                | Historical policy drift                                                                                        | `playwright.config.ts` uses `retries: 0` — fix root cause per FLAKY_TESTS                                                                                                                                                                    |
| Muscle WebGL e2e timeout / perf-budget flake                    | Heavy WebGL specs run ~2.5x slower on CI software WebGL (SwiftShader); frame-time measures runner GPU, not app | **Removed** `muscle-full-body-skeleton` + `muscle-orbit-perf` (low ROI; deterministic guardrails `muscleAssetPerfBudget.test.ts` + `canvasPerfGuardrails.test.ts` cover the real causes). See `docs/TEST_STRATEGY.md` § Low-ROI test removal |
| Scoped e2e on push runs full smoke (87 tests)                   | `run-scoped-e2e.mjs` called without merge base; empty diff vs `origin/main`                                    | Pass `${{ github.event.before }}` in `ci.yml`; guard: `ciScopeGuardrails.test.ts`                                                                                                                                                            |
| Playback UI flake (Stanza card `button` → `<a>`)                | Link rollout changed library cards; e2e still targeted `button.stanza-library-card`                            | Use `clickStanzaLibraryCard()`; guardrail `e2eSelectorGuardrails.test.ts`                                                                                                                                                                    |
| Sight LCP advisory flake (~3250ms vs 3000ms)                    | Sample started before practice shell painted                                                                   | Wait for practice chrome; budget 3500ms — `layout-advisory.spec.ts`                                                                                                                                                                          |
| Interaction budget flake (~450ms vs 400ms) under parallel smoke | Cold first interaction + 4 workers on shared CI runner                                                         | Warmup action + `RELAXED_INTERACTION_BUDGET_MS`; see `words-practice-interaction.spec.ts`                                                                                                                                                    |

## Local pre-push memory (dev machines)

`.husky/pre-push` runs the full e2e suite on the **dev server**, so it is memory-hungry: Playwright's default (~50% of cores) launches several Chromium at once, and Vitest runs 6 isolated threads. On a 16GB machine that peak can tip the system into swap, which slows renders enough to **flake the tail-end playback specs** (`e2e/playback-ui-regressions.spec.ts`) — a load artifact, not a real regression (those specs pass in seconds standalone and in CI).

- **Parallelism is capped locally** (CI is uncapped — dedicated RAM): Playwright `workers: 2`, Vitest `maxWorkers: 3`, both `!CI`-gated, overridable via `LABS_E2E_WORKERS` / `LABS_VITEST_WORKERS`. Enforced by `src/shared/toolingConfigGuardrails.test.ts`.
- **If a push still flakes on a playback spec:** it is memory, not code. Free RAM (a browser with many tabs is usually the largest consumer) or push from a **fresh terminal** (a long agent session accumulates memory a new process tree clears). Do **not** widen the flaky waits to chase it, and never `git push --no-verify`.
- **Push branches early**, while the machine is fresh, and batch related work into one branch to minimise ~10-minute pre-push cycles.

## Related

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md)
- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md)
- [`docs/ROLLBACK.md`](ROLLBACK.md)
