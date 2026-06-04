<!-- Solo dev: no human review. Merge bar = green CI + local presubmit. See docs/PR_WORKFLOW.md -->

## Summary

<!-- What changed and why (1–3 bullets). -->

## Bug-fix handoff (when applicable)

Fill these when fixing playback, notation, portal, or async-load UI bugs:

| Field                     | Your answer                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **User-visible symptom**  | <!-- e.g. drum highlight stuck on beat 1 -->                                                                 |
| **Root cause class**      | <!-- one of: stale state · portal styling · render order · async race · empty-state logic · fake stopAll --> |
| **Regression test added** | <!-- file path(s), e.g. drumPlaybackNotePointer.test.ts -->                                                  |

## Test plan

- [ ] `npm run presubmit`
- [ ] CI green on PR (`test` job)
- [ ] Manual / E2E (if UI or playback): <!-- route or spec name -->

## Process improvements (when applicable)

<!-- Session learnings codified in this PR — link files or write "none". See docs/CONTINUOUS_PROCESS_IMPROVEMENT.md -->

| Item                                      | Root cause class        | Artifact added/updated                          |
| ----------------------------------------- | ----------------------- | ----------------------------------------------- |
| <!-- e.g. Words menu purple in portal --> | <!-- portal styling --> | <!-- playback-ui-regressions.mdc, e2e smoke --> |
