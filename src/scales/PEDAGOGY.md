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

For each subdivision family (eighth, triplet, sixteenth), **full scales** and **pentascales** use paired stages:

| Stage suffix                           | Click mode                              | Advancement                                    | Guide audio             |
| -------------------------------------- | --------------------------------------- | ---------------------------------------------- | ----------------------- |
| `*g` (e.g. `s11g`)                     | Every subdivision slot; downbeat louder | 3 clean runs @ **85%**                         | On                      |
| Beat-only (e.g. `s11`)                 | Quarter-note clicks only                | Perfect-run streak (max **3** on subdivisions) | Off when `mutePlayback` |
| Bridge beat-only w/ grid (e.g. `s11m`) | Full triplet click grid @ moderate BPM  | Perfect-run streak                             | Off (`mutePlayback`)    |

**Pentascale ids:** `p8eg` / `p8e`, `p8g` / `p8`, `p8tg` / `p8t`, `p9g` / `p9` (same ladder, fewer tempo steps than full scales).

**Full-scale ids:** `s9g` / `s9`, `s11g` / `s11`, `s11mg` / `s11m`, `s12g` / `s12`, etc. — generated for **every** key via `buildStages(exerciseId)`, not C major only.

**Resume rule:** learners on beat-only subdivision work who have not cleared the paired `*g` stage are redirected to guided work on load (`redirectCurrentStageToGuidedScaffold`).

**Regress rule:** auto-regress from beat-only subdivision goes to the paired `*g` stage, not the previous subdivision type.

## Advancement criteria (single source of truth)

Canonical module: [`progress/advancementRegimen.ts`](progress/advancementRegimen.ts).

| Regimen              | Stage types                                | Gate                                                                                     |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **perfect-streak**   | Free tempo; all beat-only metronome stages | Literal pitch + timing perfection ({@link runMeetsPerfectBar}), then overlearning streak |
| **guided-threshold** | Subdivision scaffold (`*g`, guide on)      | 3 consecutive runs @ **85%** (or stage threshold)                                        |

Do not use `getAdvancementCriteria` / “clean bar” for beat-only metronome advancement — those thresholds apply only to guided-threshold stages.

Implemented in [`stageAdvancementGateMet`](progress/store.ts) and [`resolveAdvancementRegimen`](progress/advancementRegimen.ts).

## Cognitive load

Do not stack **from-memory** (`mutePlayback`) on the **first** beat-only triplet stage (`s11`). Guided stages always keep guide playback on.

## Audio

Subdivision click scheduling is shared: [`src/shared/audio/metronome/subdivisionClickSchedule.ts`](../shared/audio/metronome/subdivisionClickSchedule.ts) — consumed by Scales score playback and aligned with the rhythm metronome accent hierarchy.
