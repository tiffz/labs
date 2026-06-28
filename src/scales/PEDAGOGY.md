# Learn Your Scales — teaching principles

Canonical pedagogy doc for the Scales app. Stage ordering lives in [`curriculum/stages.ts`](curriculum/stages.ts); learner copy in [`COPY_STYLE.md`](COPY_STYLE.md).

## Design sources

- **RCM / Faber-style ladder** — free tempo → metronome quarters → subdivisions → 2-octave on-ramp → mastery.
- **Molly Gebrian, _Learn Faster, Perform Better_ (2024)** — spaced retrieval, interleaving, retrieval practice, variable difficulty, overlearning, error-driven learning.

## Principle → implementation

| Principle                   | Where it lives                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Spaced retrieval            | `needsReview`, 5-day stale, shaky &lt;70% — [`progress/store.ts`](progress/store.ts)                |
| Interleaved practice        | Session planner review slot; shaky beat-only subdivision → guided `*g` review                       |
| Retrieval practice          | `mutePlayback` / from-memory stages (deferred until rhythm is stable)                               |
| Variable difficulty         | Slow → moderate → tempo stages; BPM steps within each subdivision family                            |
| Overlearning                | Perfect streak after first perfect on **beat-only** metronome stages (capped at 3 for subdivisions) |
| Error-driven learning       | Onboarding “misses are information”; shaky hints; stuck-session coaching                            |
| **Subdivision scaffolding** | Guided click stages (`clickMode: subdivision`) → beat-only fade                                     |

## Subdivision click ladder

For each subdivision family (eighth, triplet, sixteenth), full scales use paired stages:

| Stage suffix                           | Click mode                              | Advancement                                    | Guide audio             |
| -------------------------------------- | --------------------------------------- | ---------------------------------------------- | ----------------------- |
| `*g` (e.g. `s11g`)                     | Every subdivision slot; downbeat louder | 3 clean runs @ **85%**                         | On                      |
| Beat-only (e.g. `s11`)                 | Quarter-note clicks only                | Perfect-run streak (max **3** on subdivisions) | Off when `mutePlayback` |
| Bridge beat-only w/ grid (e.g. `s11m`) | Full triplet click grid @ moderate BPM  | Perfect-run streak                             | Off (`mutePlayback`)    |

**Resume rule:** learners on beat-only subdivision work who have not cleared the paired `*g` stage are redirected to guided work on load (`redirectCurrentStageToGuidedScaffold`).

**Regress rule:** auto-regress from beat-only subdivision goes to the paired `*g` stage, not the previous subdivision type.

## Advancement criteria (single source of truth)

| Stage type                | Gate                                                          |
| ------------------------- | ------------------------------------------------------------- |
| Free tempo                | 2 runs @ 100% pitch                                           |
| Standard tempo (quarters) | Perfect-run overlearning streak                               |
| Guided subdivision (`*g`) | 3 consecutive clean runs @ 85%                                |
| Beat-only subdivision     | Perfect-run streak, required streak capped at 3               |
| Final mastery stage       | Perfect-run streak; strict 90% outcome tier for mastery label |

Implemented in [`getAdvancementCriteria`](progress/store.ts), [`stageAdvancementGateMet`](progress/store.ts), and [`isGuidedSubdivisionStage`](curriculum/guidedStages.ts).

## Cognitive load

Do not stack **from-memory** (`mutePlayback`) on the **first** beat-only triplet stage (`s11`). Guided stages always keep guide playback on.

## Audio

Subdivision click scheduling is shared: [`src/shared/audio/metronome/subdivisionClickSchedule.ts`](../shared/audio/metronome/subdivisionClickSchedule.ts) — consumed by Scales score playback and aligned with the rhythm metronome accent hierarchy.
