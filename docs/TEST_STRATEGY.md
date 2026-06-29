# Test strategy (Labs)

How we keep test coverage high without runtimes growing exponentially.

**Related:** [`FLAKY_TESTS.md`](FLAKY_TESTS.md) · [`CI_PATH_SCOPING.md`](CI_PATH_SCOPING.md) · [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md)

## Test pyramid

| Tier           | When it runs       | Scope                                          |
| -------------- | ------------------ | ---------------------------------------------- |
| **Pre-commit** | Husky              | `test:staged` — single staged app              |
| **Presubmit**  | Before done / push | Build + scoped Vitest + scoped e2e             |
| **CI**         | Every PR           | Presubmit parity + full smoke on cross-cutting |
| **Nightly**    | Cold cache         | `test:fast --retry=0`, coverage, full e2e      |

## ROI rules

1. **User-visible regressions → e2e smoke first** — cheaper than brittle unit mocks for DOM.
2. **Pure logic → Vitest `*Core.ts`** — merge rules, heuristics, invariants.
3. **No new full-suite tests** without PR justification ("what cheaper test was rejected and why").
4. **Shared helpers over duplicate specs** — `horizontalScrollHeuristicCore`, `layoutHeuristicsCore`, `interactionLatency`.
5. **Quarantine flakes** — `*.flaky.test.ts` excluded from fast path; registry row + 7-day fix deadline.

## Low-ROI test removal (be aggressive)

A test earns its place in the **blocking gate** only if it catches a regression a human cares about
more often than it flakes or burns runtime. Prune aggressively when any of these hold:

1. **Flaky with no high-value justification → delete** (not just nightly). A flake that re-runs green
   teaches nothing and erodes trust in red. Quarantine is a 7-day bridge to a fix, not a parking lot.
2. **Redundant with a cheaper deterministic test → delete the expensive one.** If a unit test already
   asserts the property (e.g. "all required bones present" via `fullBodyRuntimeInventory.test.ts`), a
   slow e2e re-verifying it through a browser adds cost, not coverage.
3. **Data/asset _audits_ belong in a script or unit test, not a blocking e2e.** "Does the export
   contain everything?" is something you run when you change the export (`npm run muscle:audit-export`,
   `muscle:inventory`) — not on every unrelated push.
4. **Frame-time / perf-budget e2e on headless software-WebGL (SwiftShader) is low-signal** — it
   measures the CI runner's GPU, not the app. Guard the _causes_ deterministically (triangle budgets,
   BVH/`frameloop` guardrails) and keep frame-time checks manual/on-demand (app `CUJs.md`).
5. **Interaction-latency budgets on shared runners are noisy.** Keep the _functional_ assertion
   (button does the thing); treat the millisecond budget as advisory, not a merge blocker.

Removed tests get a row in [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md) (status `removed`) naming
the cheaper coverage that replaced them, so the audit intent isn't silently lost.

## Time budgets

| Gate                       | Target   |
| -------------------------- | -------- |
| Pre-commit (`test:staged`) | ≤ 90s    |
| Presubmit                  | ≤ 8 min  |
| CI (scoped PR)             | ≤ 12 min |
| CI (cross-cutting)         | ≤ 20 min |
| Nightly                    | ≤ 45 min |

Measure: `npm run presubmit` logs duration; `npm run report:test-duration`.

## Quarterly audit

1. Run `npm run report:test-duration` — flag apps > 2× median duration.
2. Run `npm run report:ci-health` — target >90% success (excl. cancelled).
3. Review [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md) — zero open quarantines.
4. Prune or split tests with low bug-catch rate (document in [`ENGINEERING_HEALTH.md`](ENGINEERING_HEALTH.md)).

## Adding coverage checklist

- [ ] Smallest tier that catches the bug (unit vs smoke)
- [ ] Scoped e2e map updated if new smoke (`scripts/run-scoped-e2e.mjs`)
- [ ] CUJ row in app `CUJs.md` if interaction perf matters
- [ ] No retry-only fix for flakes
