# Process improvement backlog

**Open / deferred only.** Landed items live in **git history** and PR “Process improvements” — do not re-list Done rows here.

**How to use:** During `labs-session-retrospective`, add a row when deferring work; **delete the row** when it ships (or move a one-liner into the PR notes). Prefer implementing over backlog growth.

| Priority | Root cause class       | Proposal                                                                                                                | Status                                                  |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| P1       | `test gap`             | Dual-source Stanza e2e: YouTube ↔ uploaded switch resets transport horizon (unit: `stanzaPracticeSourceSwitch.test.ts`) | Deferred                                                |
| P1       | `local-first-breach`   | Gesture true local-blob packs (upload later) — empty-state honesty already shipped                                      | Deferred                                                |
| P2       | `ux-spec-violation`    | Cross-app responsive pass: mobile + horizontal-scroll checks on remaining `layout-heuristics-*.spec.ts` beyond Gesture  | Open — `RESPONSIVE_DESIGN.md` practices; Gesture done   |
| P2       | `reactive-audio`       | Midi scratchpad loop notes → look-ahead scheduler (exception documented in `SHARED_AUDIO_PLATFORM`)                     | Deferred                                                |
| P2       | `reactive-audio`       | Encore chart measure transport → platform measure scheduler                                                             | Deferred                                                |
| P2       | `wrong-io-tier`        | Zine Studio: full-res pages as blob/IndexedDB instead of giant data URLs (thumbs already in UI)                         | Deferred                                                |
| P3       | `main-thread-jank`     | Zine Studio BookReader: stream pages into PageFlip instead of full preprocess-before-init                               | Deferred                                                |
| P3       | `hmr-context-identity` | Audit other Provider+hook splits; pin on `globalThis` like `encoreSyncContextStore.ts` when Fast Refresh flakes recur   | Deferred — apply on next occurrence                     |
| P3       | `e2e-port-collision`   | Pre-push: detect occupied `:5173` and print a one-line fix                                                              | Deferred — note in `FLAKY_TESTS.md`                     |
| P3       | `tech-debt`            | Remove stale `atlas_skin` region from muscle export scripts (skin dropped, ADR 0018)                                    | Deferred                                                |
| P3       | `portal styling`       | Audit Piano/Chords/Stanza document-dismiss handlers if they embed dense drum Edit — same allowlist as Words             | Deferred — apply when a host grows dismiss around drums |

## Ongoing operations (not one-shot code)

| Item                     | Cadence                                  | Notes                                                            |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------- |
| CI success ≥90%          | Weekly — `weekly-engineering-health.yml` | `npm run report:ci-health -- --fail-below 90`                    |
| Sight LCP advisory flake | When touching `layout-advisory`          | Warmup or CI-aware budget if parallel LCP exceeds 3000ms         |
| Knip unused exports      | Per-symbol when touching a module        | Avoid bulk delete of Gesture/Drive test helpers                  |
| Crash beacon production  | One-time deploy                          | `workers/labs-crash-beacon/` — KV + `VITE_LABS_CRASH_BEACON_URL` |

## Related

- Skill: `labs-session-retrospective`
- Policy: [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)
- Sync gaps: [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) § Known gaps
