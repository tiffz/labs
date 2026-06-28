# CI reliability (GitHub Actions)

How Labs keeps [GitHub Actions](https://github.com/tiffz/labs/actions) green and what to do when it flakes. Solo dev: **CI is the review gate** — see [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md).

## Workflow map

| Workflow                         | Triggers                                          | Blocking?            | Deploys Pages?                                                  |
| -------------------------------- | ------------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| **`CI/CD`** (`ci.yml`)           | Push/PR when code, docs, config, or assets change | **Yes** — merge gate | **Yes** — `deploy` job on `main` push only, after `test` passes |
| **`Nightly Flakiness Detector`** | Schedule + manual                                 | No — early warning   | No                                                              |
| **`Rollback`**                   | Manual                                            | N/A                  | Redeploy older SHA                                              |

## Merge gate (what must be green)

On PRs and `main`, the **`test`** job in `CI/CD` must pass:

- Import boundaries, agent-docs, doc-links, ui-copy, css-important
- Lint, typecheck, knip
- E2e smoke + playback UI regressions (**before** Vitest — fail-fast on smokes)
- Full Vitest (`npm test`, with **one retry** in CI for rare worker teardown flakes)
- Production build (artifact reused by `deploy` — no second compile on `main`)

**Advisory (non-blocking):** visual regression on cross-cutting `main`/`PR` diffs only (exits 0 with a warning when snapshots differ; artifacts uploaded). Full visual matrix and **coverage** run **nightly** (`Nightly Flakiness Detector`).

## Pages deployment (single path)

Only **`ci.yml` → `deploy`** automatically calls `actions/deploy-pages` on push to `main`.

- **`rollback.yml`** also deploys Pages, but only via manual **`workflow_dispatch`** — it shares the same `pages-deploy-${{ github.ref }}` concurrency group so rollback and CI deploy cannot race.
- **`concurrency`** group `pages-deploy-${{ github.ref }}` with `cancel-in-progress: true` — rapid pushes cancel stale deploys; only latest `main` publishes.
- **`deploy` job** waits 90s and retries `actions/deploy-pages` once when the first attempt fails (typical error: `in progress deployment`).
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

Skill: **`labs-babysit-pr`**. When adding checks, prefer extending `ci.yml` `test` job over new workflows unless there is a strong isolation reason (see nightly flakiness).

## Failure triage

| Symptom                                                         | Likely cause                                                                                                                | Fix                                                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `in progress deployment` on **deploy**                          | Two deploys raced (historical) or external Pages activity                                                                   | Deploy job auto-retries once after 90s; confirm single deploy path                                                                 |
| Gesture collections scroll perf flake (50.1ms on 50ms budget)   | Scroll perf helper counted intentional `stepDelayMs` pacing in frame samples                                                | Fixed measurement in `e2e/helpers/gestureScrollPerf.ts`                                                                            |
| Knip / lint / typecheck failed                                  | Real regression                                                                                                             | Fix code                                                                                                                           |
| Vitest timeout at 10s on lazy-import test                       | `findBy*` timeout > `testTimeout`                                                                                           | Preload in `beforeAll`; raise `it` timeout — see `docs/FLAKY_TESTS.md`                                                             |
| Story `App.test.tsx` flake on CI                                | Same — cold dynamic imports vs 10s cap                                                                                      | Fixed via preload + explicit test timeout                                                                                          |
| E2e smoke parse error                                           | Syntax error in imported TS                                                                                                 | Fix source; run smoke locally                                                                                                      |
| Visual step warning, job green                                  | Expected — visual is advisory on cross-cutting diffs                                                                        | Inspect artifact; update baselines intentionally or fix nightly visual job                                                         |
| Workflow red after push but newer push exists                   | Cancelled superseded run (GitHub shows red)                                                                                 | Check **latest** run on branch — not cancelled rows                                                                                |
| Playwright flake masked by retry                                | Historical policy drift                                                                                                     | `playwright.config.ts` uses `retries: 0` — fix root cause per FLAKY_TESTS                                                          |
| Muscle full-body skeleton `Test timeout 90000ms exceeded`       | Heaviest WebGL spec (~400k tris) runs ~2.5x slower on CI software WebGL under parallel muscle contention; 90s cap too tight | CI-aware caps in `muscle-full-body-skeleton.spec.ts` (`isCI` → 180s/120s); caps only bite in slow tail — see `docs/FLAKY_TESTS.md` |
| Scoped e2e on push runs full smoke (87 tests)                   | `run-scoped-e2e.mjs` called without merge base; empty diff vs `origin/main`                                                 | Pass `${{ github.event.before }}` in `ci.yml`; guard: `ciScopeGuardrails.test.ts`                                                  |
| Playback UI flake (Stanza card `button` → `<a>`)                | Link rollout changed library cards; e2e still targeted `button.stanza-library-card`                                         | Use `clickStanzaLibraryCard()`; guardrail `e2eSelectorGuardrails.test.ts`                                                          |
| Sight LCP advisory flake (~3250ms vs 3000ms)                    | Sample started before practice shell painted                                                                                | Wait for practice chrome; budget 3500ms — `layout-advisory.spec.ts`                                                                |
| Interaction budget flake (~450ms vs 400ms) under parallel smoke | Cold first interaction + 4 workers on shared CI runner                                                                      | Warmup action + `RELAXED_INTERACTION_BUDGET_MS`; see `words-practice-interaction.spec.ts`                                          |

## Related

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md)
- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md)
- [`docs/ROLLBACK.md`](ROLLBACK.md)
