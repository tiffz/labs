# Process improvement backlog

Proposed durable fixes from session retrospectives **not yet implemented**. Land items in PRs; remove rows when merged.

**How to use:** Agents add rows during `labs-session-retrospective`; humans prioritize; implement top items in focused PRs.

| Priority | Root cause class      | Proposal                                                                                                                            | Status                                                          |
| -------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P1       | `ux-redundancy`       | Aggregate upload/sync progress at shell level (one bar, not N per card) — document pattern in `UX_AGENT_GUIDE.md` § Status surfaces | Done — see UX guide                                             |
| P1       | `wrong-io-tier`       | Gesture media tier policy + rule + smoke                                                                                            | Done                                                            |
| P2       | `test gap`            | Path-scoped CI e2e for single-app PRs                                                                                               | Done — `scripts/run-scoped-e2e.mjs`                             |
| P2       | `ux-journey-overload` | `labs-ux-journey` skill + mandatory journey sketch for new screens                                                                  | Done                                                            |
| P3       | —                     | Auto-merge squash when presubmit green (GitHub repo setting)                                                                        | Done — [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § Auto-merge     |
| P3       | `test gap`            | Encore/Gesture visual smoke for “obvious bad” layout (padding/contrast heuristics)                                                  | Done — `layout-heuristics-*.spec.ts`, `layoutHeuristicsCore.ts` |

## Completed (archive reference)

| Session                    | Landed in                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Gesture preview thumbnails | `gestureMediaPolicy.ts`, `gesture-media-tiers.mdc`, `gesture-preview-strip.spec.ts`                |
| UX journey hard gate       | `ux-journey-mandatory.mdc`, `labs-ux-journey` skill                                                |
| Layout heuristic smokes    | `layout-heuristics-gesture.spec.ts`, `layout-heuristics-encore.spec.ts`, `layoutHeuristicsCore.ts` |
| Mark done (Gesture zen)    | `ZenSessionPhase.tsx` checkmark + `drawHistory` on early complete                                  |
| Dexie empty flash          | `resolveDexieLiveQuery`, `dexie-live-query-empty-states.mdc`                                       |
| ESLint warning drift       | `pre-commit-checks.mdc` zero-warning policy                                                        |
| Vitest teardown noise      | Removed aggressive `clearTimeout` loop in `setupTests.ts`                                          |
| Agent process index        | `AGENT_INVARIANTS.md`, retrospective skill upgrade, PR template                                    |
