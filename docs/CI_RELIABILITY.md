# CI reliability (GitHub Actions)

How Labs keeps [GitHub Actions](https://github.com/tiffz/labs/actions) green and what to do when it flakes. Solo dev: **CI is the review gate** — see [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md).

## Workflow map

| Workflow                                                   | Triggers                                          | Blocking?                             | Deploys Pages?                                                  |
| ---------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| **`CI/CD`** (`ci.yml`)                                     | Push/PR when code, docs, config, or assets change | **Yes** — merge gate                  | **Yes** — `deploy` job on `main` push only, after `test` passes |
| **`Retry failed Pages deploy`** (`retry-pages-deploy.yml`) | After a failed `CI/CD` **deploy** job             | No — auto-heals transient Pages races | Re-runs failed deploy job once                                  |
| **`Nightly Flakiness Detector`**                           | Schedule + manual                                 | No — early warning                    | No                                                              |
| **`Rollback`**                                             | Manual                                            | N/A                                   | Redeploy older SHA                                              |

## Merge gate (what must be green)

On PRs and `main`, the **`test`** job in `CI/CD` must pass:

- Import boundaries, agent-docs, doc-links, ui-copy, css-important
- Lint, typecheck, knip
- Full Vitest (`npm test`, with **one retry** in CI for rare worker teardown flakes)
- E2e smoke + playback UI regressions
- Production build

**Advisory (non-blocking):** visual regression screenshots (`continue-on-error: true`), coverage upload.

## Pages deployment (single path)

Only **`ci.yml` → `deploy`** automatically calls `actions/deploy-pages` on push to `main`.

- **`rollback.yml`** also deploys Pages, but only via manual **`workflow_dispatch`** — it shares the same `pages-deploy-${{ github.ref }}` concurrency group so rollback and CI deploy cannot race.
- **`concurrency`** group `pages-deploy-${{ github.ref }}` with `cancel-in-progress: true` — rapid pushes cancel stale deploys; only latest `main` publishes.
- **`retry-pages-deploy.yml`** waits 90s and re-runs failed deploy jobs once (typical error: `in progress deployment`).
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
5. If deploy failed with Pages race, wait for auto-retry or run `gh run rerun <id> --failed` on the deploy job.

Skill: **`labs-babysit-pr`**. When adding checks, prefer extending `ci.yml` `test` job over new workflows unless there is a strong isolation reason (see nightly flakiness).

## Failure triage

| Symptom                                                                            | Likely cause                                              | Fix                                                             |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `in progress deployment` on **deploy**                                             | Two deploys raced (historical) or external Pages activity | Auto-retry workflow; confirm single deploy path; re-run deploy  |
| Vitest passed count OK but job failed with `Unhandled Errors` / `BroadcastChannel` | Worker teardown flake                                     | CI retries once; if persistent, fix test cleanup or run nightly |
| Knip / lint / typecheck failed                                                     | Real regression                                           | Fix code                                                        |
| E2e smoke parse error                                                              | Syntax error in imported TS                               | Fix source; run smoke locally                                   |
| Visual step red, job green                                                         | Expected — visual is advisory                             | Inspect artifact if UI change was intentional                   |
| Workflow red after push but newer push exists                                      | Cancelled superseded run                                  | Check latest run on `main`                                      |

## Related

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md)
- [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md)
- [`docs/ROLLBACK.md`](ROLLBACK.md)
