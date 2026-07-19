# Performance budgets

Canonical table of every enforced performance budget, its threshold, and where it is enforced.
Guidance for profiling and fixing regressions lives in [`PERFORMANCE.md`](PERFORMANCE.md) and the
[`labs-performance`](../.cursor/skills/labs-performance/SKILL.md) skill. New micro-apps get a
bundle baseline row as part of [`labs-new-micro-app`](../.cursor/skills/labs-new-micro-app/SKILL.md).

## Two-tier philosophy

Most runtime budgets use two tiers because CI runner noise (shared CPU, software WebGL) makes
tight thresholds flaky:

- **1x budget — advisory.** Over-budget prints a warning; the blocking check at this tier is the
  functional assertion (the control did the thing).
- **3x budget — hard fail.** `HARD_FAIL_MULTIPLIER` in
  [`src/shared/test/interactionLatencyCore.ts`](../src/shared/test/interactionLatencyCore.ts).
  Nothing legitimate is 3x over; that is a real regression.

Bundle size and Lighthouse use committed baselines with ratchets instead (deterministic, no
runner noise).

## Bundle size (eager JS per app)

Measured as the entry chunk + modulepreloads referenced from each app's built `index.html`
(gzip bytes), by [`scripts/bundle-size-report.mjs`](../scripts/bundle-size-report.mjs) against
[`docs/bundle-size-baseline.json`](bundle-size-baseline.json).

| Tier         | Threshold                     | Consequence                                                                             |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------- |
| Growth warn  | > 10% gzip growth vs baseline | CI warning annotation                                                                   |
| Growth fail  | > 25% gzip growth vs baseline | CI + presubmit fail                                                                     |
| Absolute cap | > 2 MiB gzip                  | CI + presubmit fail (exemptions listed in the script with tracked work items: `encore`) |

Enforced in the CI `build` job and presubmit (`--check`). Justified growth: run
`npm run report:bundle-size -- --skip-build --update-baseline` and land the baseline change in
the same PR with a sentence of justification.

## Interaction latency (Playwright smokes)

Budgets in [`src/shared/test/interactionLatencyCore.ts`](../src/shared/test/interactionLatencyCore.ts),
reported via `reportInteractionLatency` ([`e2e/helpers/interactionLatency.ts`](../e2e/helpers/interactionLatency.ts)).

| Budget               | 1x (advisory) | 3x (hard fail) |
| -------------------- | ------------- | -------------- |
| Default interaction  | 400 ms        | 1200 ms        |
| Relaxed interaction  | 800 ms        | 2400 ms        |
| Tab/route navigation | 1200 ms       | 3600 ms        |
| Audio play/stop      | 650 ms        | 1950 ms        |

## Scroll / sustained render

[`src/shared/test/gestureScrollPerfCore.ts`](../src/shared/test/gestureScrollPerfCore.ts),
asserted in `e2e/smoke/gesture-collections-scroll.spec.ts`.

| Metric                                 | 1x (advisory) | Hard fail         |
| -------------------------------------- | ------------- | ----------------- |
| Max / p95 frame during scripted scroll | 50 ms         | p95 > 150 ms (3x) |
| Long tasks (>50 ms) per burst          | 6             | advisory only     |

## Heap soaks (nightly + app-scoped e2e)

Growth ratio in [`e2e/helpers/stanzaPlaybackSoak.ts`](../e2e/helpers/stanzaPlaybackSoak.ts):
used heap after soak must stay under **1.55x** the post-warmup baseline.

| Soak                                  | Spec                                          |
| ------------------------------------- | --------------------------------------------- |
| Stanza loop playback (20 wraps)       | `e2e/smoke/stanza-playback-soak.spec.ts`      |
| Gesture repeated sessions (10 rounds) | `e2e/smoke/gesture-session-heap-soak.spec.ts` |

`@soak` specs are excluded from PR CI (`test:e2e:smoke`) and run nightly (`test:e2e:soak`) plus
in their own app's scoped e2e runs.

## Muscle 3D asset budgets

Deterministic triangle/size budgets in
[`src/muscle/muscleAssetPerfBudget.ts`](../src/muscle/muscleAssetPerfBudget.ts), enforced by
`muscleAssetPerfBudget.test.ts` (Vitest, every CI run). Orbit frame-time is manual QA (CUJ-001) —
frame timing on CI software WebGL measures the runner, not the app.

## Lighthouse per-app floors

[`scripts/lighthouse-audit.mjs`](../scripts/lighthouse-audit.mjs) against
[`docs/lighthouse-baseline.json`](lighthouse-baseline.json), run nightly with `--fail`.

- **Floor** = committed per-app baseline − 5 points per category (− 10 for performance, which
  swings run-to-run on shared runners). Dropping below fails.
- **Ratchet** — `--update-baseline` only raises scores; a deliberate lowering requires
  `--reset-baseline` plus justification in the PR.
- Flat category targets (perf 65 / a11y 90 / best-practices 92 / SEO 80) are aspirational and
  advisory only.

## Where each gate runs

| Gate                    | Presubmit               | PR CI                | Nightly               |
| ----------------------- | ----------------------- | -------------------- | --------------------- |
| Bundle two-tier + cap   | yes (`--check`)         | build job            | —                     |
| Interaction 3x ceilings | scoped e2e              | e2e job              | full smoke            |
| Scroll p95 3x ceiling   | gesture-scoped e2e      | e2e job              | full smoke            |
| Heap soaks              | owning app's scoped e2e | — (`@soak` excluded) | `test:e2e:soak`       |
| Muscle asset budgets    | scoped Vitest           | vitest job           | —                     |
| Lighthouse floors       | —                       | —                    | `--production --fail` |
