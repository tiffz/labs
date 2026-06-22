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
