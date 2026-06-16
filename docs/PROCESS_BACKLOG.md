# Process improvement backlog

Proposed durable fixes from session retrospectives **not yet implemented**. Land items in PRs; remove rows when merged.

**How to use:** Agents add rows during `labs-session-retrospective`; humans prioritize; implement top items in focused PRs.

| Priority | Root cause class       | Proposal                                                                                                                            | Status                                                         |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P1       | `ux-redundancy`        | Aggregate upload/sync progress at shell level (one bar, not N per card) — document pattern in `UX_AGENT_GUIDE.md` § Status surfaces | Done — see UX guide                                            |
| P1       | `wrong-io-tier`        | Gesture media tier policy + rule + smoke                                                                                            | Done                                                           |
| P2       | `test gap`             | Path-scoped CI e2e for single-app PRs                                                                                               | Done — `scripts/run-scoped-e2e.mjs`                            |
| P2       | `ux-journey-overload`  | `labs-ux-journey` skill + mandatory journey sketch for new screens                                                                  | Done                                                           |
| P3       | —                      | Auto-merge squash when presubmit green (GitHub repo setting)                                                                        | Done — [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § Auto-merge    |
| P2       | `optimistic-ui-gap`    | Document inline-metadata optimistic patterns in app `DESIGN.md` when chips + autocomplete share a registry                          | Done — `src/gesture/DESIGN.md` § Inline collection metadata    |
| P3       | `test gap`             | Vitest isolation flake (`gestureDeleteCollection` BroadcastChannel under full `test:fast` load)                                     | Done — `MockBroadcastChannel` in `setupTests.ts`               |
| P3       | —                      | Add `CUJs.md` for Encore library/practice primary flows                                                                             | Done — `src/encore/CUJs.md`                                    |
| P1       | `test gap`             | `presubmit:push` + `AGENT_INVARIANTS` / `AGENTS.md` push checklist                                                                  | Done — `npm run presubmit:push`                                |
| P1       | `hmr false confidence` | CSS PostCSS parse via `scripts/presubmit-css-if-needed.mjs` in presubmit                                                            | Done                                                           |
| P2       | `test gap`             | Gesture AGENTS.md e2e coupling (hash routes, preview count, tab panels)                                                             | Done                                                           |
| P2       | —                      | Husky pre-push opt-in `LABS_PRESUBMIT_PUSH=1` → `presubmit:push`                                                                    | Done — `.husky/pre-push`                                       |
| P3       | —                      | PR workflow § Velocity: split feature trains                                                                                        | Done — `docs/PR_WORKFLOW.md`                                   |
| P1       | `main-thread-jank`     | Gesture pack stats cursor aggregate + shared provider + grid memo + `content-visibility`                                            | Done — `GesturePackStatsProvider`, `CollectionsCollectionGrid` |

## Completed (archive reference)

| Session                                 | Landed in                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Gesture media / preview strips          | [`docs/GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md), `gesturePreviewDisplayInvariants.test.ts`, `gesture-preview-strip.spec.ts` |
| Gesture inline tags + registry          | `InlinePackTags.tsx`, `gestureTagRegistry.ts`, `useGestureKnownTags`, `DESIGN.md` § Inline collection metadata                              |
| Performance / CUJ process               | `docs/PERFORMANCE.md`, `docs/CRITICAL_USER_JOURNEYS.md`, `labs-performance`, interaction smokes (Gesture, Encore, Sight)                    |
| Sight debug layout regression           | `sight.css` always-on viewport calc, `CUJs.md`, `sight-practice-interaction.spec.ts`                                                        |
| Sight Albers perceived pedagogy         | `MIN_INDUCED_DELTAS`, `AlbersInductionReveal`, `PERCEIVED_TEMPERATURE_INDUCTION` diagnostic                                                 |
| UX journey hard gate                    | `ux-journey-mandatory.mdc`, `labs-ux-journey` skill                                                                                         |
| Layout heuristic smokes                 | `layout-heuristics-gesture.spec.ts`, `layout-heuristics-encore.spec.ts`, `layoutHeuristicsCore.ts`                                          |
| Mark done (Gesture zen)                 | `ZenSessionPhase.tsx` checkmark + `drawHistory` on early complete                                                                           |
| Dexie empty flash                       | `resolveDexieLiveQuery`, `dexie-live-query-empty-states.mdc`                                                                                |
| ESLint warning drift                    | `pre-commit-checks.mdc` zero-warning policy                                                                                                 |
| Vitest teardown noise                   | Removed aggressive `clearTimeout` loop in `setupTests.ts`                                                                                   |
| Agent process index                     | `AGENT_INVARIANTS.md`, retrospective skill upgrade, PR template                                                                             |
| CI presubmit parity + Gesture grid perf | `presubmit:push`, `presubmit-css-if-needed.mjs`, `GesturePackStatsProvider`, grid scroll opts                                               |
