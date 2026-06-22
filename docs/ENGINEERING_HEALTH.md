# Engineering health (Labs)

Quarterly snapshot of development-system quality. Update after each audit.

**Commands:** `npm run report:ci-health` · `npm run report:test-duration` · `npm run report:bundle-size`

## Targets (3-month)

| Metric                            | Target    | Last measured                                      |
| --------------------------------- | --------- | -------------------------------------------------- |
| CI success rate (excl. cancelled) | > 90%     | Run `npm run report:ci-health`                     |
| Presubmit duration                | ≤ 8 min   | Logged at end of `npm run presubmit`               |
| Open flaky registry rows          | 0         | [`FLAKY_TEST_REGISTRY.md`](FLAKY_TEST_REGISTRY.md) |
| Apps with CUJ doc                 | ≥ 12 / 21 | Count `src/*/CUJs.md`                              |
| Apps with layout smoke            | ≥ 8       | `e2e/smoke/layout-heuristics-*.spec.ts`            |
| PROCESS_BACKLOG P1 open           | 0         | [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md)         |

## Baseline (2026-06-22)

- Strict presubmit: build + scoped e2e + scoped Vitest
- Pre-push: `presubmit:push` default-on
- Crash: `LabsErrorBoundary` + IndexedDB log on all apps
- Layout smokes: Encore, Gesture, Sight, Stanza, Zinebox, Muscle, Drums, Words
- Playwright CI retries: 0 (fix root cause; see [`FLAKY_TESTS.md`](FLAKY_TESTS.md))

## What we stopped doing

_(Record pruned tests, removed duplicate patterns, retired flaky quarantines each quarter.)_

- —

## Session metrics (agents)

Track in retrospectives ([`labs-session-retrospective`](../.cursor/skills/labs-session-retrospective/SKILL.md)):

- Human UX correction rounds (count)
- Presubmit failures before green (count)
- Root cause class (existing labels)
- Token waste: re-discovered files (qualitative)
