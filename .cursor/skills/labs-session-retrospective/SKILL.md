---
name: labs-session-retrospective
description: Runs a lightweight end-of-session retrospective and proposes durable process improvements. Use when a substantial session completes, the user asks for process feedback, or when codifying learnings into rules, tests, or docs.
---

# Labs session retrospective

## When to run

Run when **any** of these apply (skip for single obvious fixes):

- Fixed **two or more** bugs or touched **multiple** subsystems
- Same **root cause class** appeared more than once
- Investigation slowed because docs, tests, or rules were missing
- User asks for process feedback or says the session is complete

## Workflow

1. Structure findings as **symptom → root cause class → durable fix**
2. Reuse root cause labels from [references/continuous-process-improvement.md](references/continuous-process-improvement.md)
3. **Propose** artifacts in priority order: regression test → Cursor rule → doc checklist → PR template → ADR (material only)
4. **Codify on second occurrence** — same root cause class twice → propose durable artifact without waiting for a third
5. If user wants codification, implement and run `npm run presubmit`
6. Record landed items in PR **Process improvements** section

## Handoff types (do not conflate)

| Name                      | When                                  | Doc                                                                               |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| **Iteration handoff**     | Mid-refactor; next person needs state | `DEVELOPMENT.md` § Iteration handoff                                              |
| **Process retrospective** | Session complete; improve how we work | This skill + `CONTINUOUS_PROCESS_IMPROVEMENT.md`                                  |
| **Bug-fix handoff**       | Fixed a regression                    | PR template § Bug-fix handoff; skill `labs-playback-bugfix` when playback-related |

## Default at session end

Before closing a substantial session, **offer** a brief retrospective (bullets, not an essay) even if the user did not ask.
