# Process improvement backlog

**Open / deferred only.** Landed items live in **git history** and PR “Process improvements” — do not re-list Done rows here.

**How to use:** During `labs-session-retrospective`, add a row when deferring work; **delete the row** when it ships (or move a one-liner into the PR notes). Prefer implementing over backlog growth.

| Priority | Root cause class     | Proposal                                                                                                                 | Status                                                                                                                  |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| P1       | `local-first-breach` | Gesture true local-blob packs (upload later) — empty-state honesty already shipped                                       | Entry criteria: user reports needing offline pack creation, or Gesture Drive quota/auth errors recur in a session       |
| P2       | `reactive-audio`     | Midi scratchpad loop notes → look-ahead scheduler (exception documented in `SHARED_AUDIO_PLATFORM`)                      | Entry criteria: audible drift/stutter reported in scratchpad loops, or next Midi playback feature touches the loop path |
| P2       | `reactive-audio`     | Encore chart measure transport → platform measure scheduler                                                              | Entry criteria: next Originals chart playback feature, or measure-highlight drift reported                              |
| P2       | `wrong-io-tier`      | Zine Studio: full-res pages as blob/IndexedDB instead of giant data URLs (thumbs already in UI)                          | Entry criteria: quota errors or >1s page-save jank observed; do alongside next Zine Studio storage change               |
| P3       | `main-thread-jank`   | Zine Studio BookReader: stream pages into PageFlip instead of full preprocess-before-init                                | Entry criteria: reader-open time exceeds CUJ budget on a real zine, or next BookReader feature                          |
| P3       | `ux-visual-weight`   | Scrapboard: optional CSS lint that `.scrapboard-emoji` parents never set `overflow: hidden`                              | Deferred — AGENTS note landed; automate if clip recurs                                                                  |
| P2       | `ci-blocking-idle`   | Flip cross-cutting CI visual step from advisory to blocking after ~2 weeks of clean nightly visual runs                  | Open — trigger documented in `VISUAL_REGRESSION_AGENT.md`                                                               |
| P3       | `test gap`           | Muscle visual coverage disabled (continuous WebGL redraw); revisit with a frame-freeze hook or golden render             | Deferred — see `e2e/routeRegistry.ts` comment                                                                           |
| P3       | `test gap`           | Trim heavy mocked `App.test.tsx` shells (cats 751 lines, drums) toward logic tests + e2e boot coverage                   | Deferred — audit finding, low urgency                                                                                   |
| P3       | `guidance-drift`     | Automated LLM guidance eval harness (Cursor SDK) to run `GUIDANCE_EVALS.md` scenarios; manual quarterly protocol for now | Deferred — roadmap option in `GUIDANCE_EVALS.md`                                                                        |
| P3       | `tech-debt`          | StanzaWorkspace next tranches: transpose decode pipeline hook, stem alignment hook (~3050 lines remaining)               | Deferred — `COMPONENT_DECOMPOSITION_PATTERN.md`                                                                         |

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
