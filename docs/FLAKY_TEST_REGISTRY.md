# Flaky test registry

Track known flaky tests so they get fixed or quarantined — not masked with retries.

**Policy:** [`docs/FLAKY_TESTS.md`](FLAKY_TESTS.md) · **CI health:** `npm run report:ci-health`

## Quarantine convention

1. Rename to `*.flaky.test.ts` **or** add `@flaky` in the test title.
2. Add a row below with status `quarantined` and a **7-day fix deadline**.
3. Quarantined tests are excluded from `test:fast` and pre-commit (`vite.config.ts` exclude pattern).
4. After deadline: **fix root cause** or **delete the test** — do not extend quarantine without a new registry row.

## Registry

| File / spec                                    | Symptom                                       | Owner | Status     | Fix / notes                                              |
| ---------------------------------------------- | --------------------------------------------- | ----- | ---------- | -------------------------------------------------------- |
| `e2e/smoke/encore-originals-bulk-play.spec.ts` | Dexie seed rows slow to hydrate on cold start | agent | monitoring | Wait for `tbody tr` count before row checks (2026-06-22) |

### Resolved (archive)

| File / spec                        | Symptom                                              | Fixed in                                |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `e2e/helpers/gestureScrollPerf.ts` | Scroll perf counted intentional `stepDelayMs` pacing | Measurement fix per `CI_RELIABILITY.md` |
| `src/story/App.test.tsx`           | Cold dynamic imports vs 10s Vitest cap on CI         | Preload + explicit timeout              |
| `setupTests.ts` BroadcastChannel   | Worker teardown flake under full `test:fast` load    | `MockBroadcastChannel` in global setup  |

## Workflow

1. **Reproduce** — smallest command (`npx vitest run <file>` or `npx playwright test <spec>`).
2. **Run 3× consecutively** before declaring fixed.
3. **Fix root cause** — preload/mocks, stable selectors, isolate timers — not timeout increases alone.
4. **Update this registry** — move row to Resolved or delete quarantine entry.
5. **Measure** — `npm run report:ci-health` weekly; target >90% success rate excluding cancelled runs.
