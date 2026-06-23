# Engineering health (Labs)

Quarterly snapshot of development-system quality. Update after each audit.

**Commands:** `npm run report:ci-health` · `npm run report:ci-health -- --fail-below 90` · `npm run report:test-duration` · `npm run report:bundle-size`

Weekly gate: [`.github/workflows/weekly-engineering-health.yml`](../.github/workflows/weekly-engineering-health.yml) (Mondays 09:00 UTC).

## Targets (3-month)

| Metric                            | Target    | Last measured (2026-06-22)             |
| --------------------------------- | --------- | -------------------------------------- |
| CI success rate (excl. cancelled) | > 90%     | **75.0%** (84 actionable runs)         |
| Presubmit duration                | ≤ 8 min   | ~5 min (strict gates)                  |
| Open flaky registry rows          | 0         | 0 open (see registry)                  |
| Apps with CUJ doc                 | ≥ 12 / 21 | **22 / 22** (`src/*/CUJs.md`)          |
| Apps with layout smoke            | ≥ 8       | 8 + `layout-advisory.spec.ts` (Tier 3) |
| PROCESS_BACKLOG P1 open           | 0         | Run manual audit                       |

## CI failure triage (2026-06-22)

Recent failures (`npm run report:ci-health`) cluster in **e2e** (full smoke, playback regressions) — not lint/knip/build.

| Run ID      | Bucket | Notes                                        |
| ----------- | ------ | -------------------------------------------- |
| 27930307153 | e2e    | Full smoke — addressed via queue seed helper |
| 27891049140 | e2e    | Playback UI regressions                      |
| 27889665336 | e2e    | Full smoke                                   |

**Next:** run `npm run report:ci-failure -- <run-id>` on new failures; track weekly until >90%.

Mitigations shipped this pass:

- Docs-only / e2e-only presubmit scoping
- Deterministic Encore Originals e2e seed helper
- Nightly coverage no longer advisory-only
- Bundle size advisory step in CI (post-build)
- Tier-3 advisory smokes (axe/LCP/truncation)

## Baseline (2026-06-22)

- Strict presubmit: build + scoped e2e + scoped Vitest (docs-only fast path)
- Pre-push: `presubmit:push` default-on
- Crash: `LabsErrorBoundary` + IndexedDB log + optional `VITE_LABS_CRASH_BEACON_URL`
- Layout smokes: Encore, Gesture, Sight, Stanza, Zinebox, Muscle, Drums, Words
- All micro-apps: `React.StrictMode` on `main.tsx`
- Playwright CI retries: 0 (fix root cause; see [`FLAKY_TESTS.md`](FLAKY_TESTS.md))

## What we stopped doing

_(Record pruned tests, removed duplicate patterns, retired flaky quarantines each quarter.)_

- Encore app-local Snackbar toasts for blocking-adjacent flows → `LabsFeedbackToast`
- StrictMode opt-out list (all apps migrated)

## Session metrics (agents)

Track in retrospectives ([`labs-session-retrospective`](../.cursor/skills/labs-session-retrospective/SKILL.md)):

- Human UX correction rounds (count)
- Presubmit failures before green (count)
- Root cause class (existing labels)
- Token waste: re-discovered files (qualitative)
