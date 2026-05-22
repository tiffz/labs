# ADR 0010: Color Sight adaptive progress and daily sessions

## Status

Accepted

## Context

Color Sight’s level ladder (7 passes per level) works well as a curriculum gate but does not track _which_ perceptual skills are weak, schedule mixed review, or adapt generators when learners struggle with warm-background value reads or temperature compensation.

Learn Your Scales already separates **facts in storage** from **judgment in pure functions** (versioned progress blob, rep history with purpose, session planner, derived mastery overlay, post-session diagnostics).

## Decision

1. Extend `SightProfile` with a **skill matrix** (EMA per skill vector), **recent reps** (cap 30), **active focus** (`GrowthDiagnostic | null`), and **daily queue** state.
2. After each practice round, append a `RepRecord` and update the matrix; only `curriculum` and free `practice` reps at the frontier level increment `passesAtLevel`.
3. **Daily session**: 10 reps planned as 40% curriculum / 40% focus / 20% maintenance, with generator `PracticeGenConstraints` when a focus diagnostic is active.
4. **Diagnostics** run after a daily session (and when focus clears): rules such as warm-background value blindness set `activeFocus` and forced constraints on contextual / flashcard generators.
5. New exercise modules (levels 21–28) share the same rep pipeline: anchor pivot, Albers equalizer, Munsell slice, Yot cast.

Profile progress fields ship alongside curriculum schema v6 (28 levels); older saves backfill matrix defaults from level.

## Consequences

- Home shows skill bars, focus copy, and “Start daily session (10).”
- Maintenance and focus reps do not advance the level ladder.
- Adding a new module requires wiring `skillVector`, `repTags`, `practiceChallenge`, and `PracticePhase` reveal handlers.
- Cloud sync and session resume remain out of scope.

## Links

- `src/sight/progress/`
- `src/sight/session/dailyQueue.ts`
- Plan: Sight adaptive progress + expanded exercises
