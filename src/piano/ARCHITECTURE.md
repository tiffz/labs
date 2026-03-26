# Piano Architecture

## Purpose

Browser-based piano practice app with:

- score rendering (VexFlow),
- playback and metronome,
- MIDI/acoustic input evaluation,
- optional media alignment for practice.

## Current File Map (Critical Paths)

```text
src/piano/
  App.tsx
  store.tsx
  storeSelectors.ts
  types.ts
  components/
    ScoreDisplay.tsx
    PlaybackControls.tsx
    PracticeMode.tsx
    PracticeDashboard.tsx
    ExercisePicker.tsx
    ChordExerciseSelectors.tsx
    NoteInput.tsx
    PianoKeyboard.tsx
    VideoPlayer.tsx
  data/
    scales.ts
    chordExercises.ts
  utils/
    scorePlayback.ts
    storeScoreEditing.ts
    midiInput.ts
    practiceTimingStore.ts
    dtw.ts
    videoScoreCorrelation.ts
```

## Architecture Boundaries

- **State orchestration**: `store.tsx` (pure reducer + side effects at provider edge).
- **Reusable reducer helpers/selectors**:
  - `storeScoreEditing.ts` (score edit utility logic),
  - `storeSelectors.ts` (derived reducer decisions).
- **Playback core**:
  - piano-specific logic in `scorePlayback.ts`,
  - shared lifecycle/instrument primitives in `src/shared/playback/**`.
- **Chord theory/voicing dependencies**:
  - consumed from `src/shared/music/**` (canonical source), not `src/chords/**`.

## High-Risk Flows

1. **Practice timing**
   - expected-note times and input times must stay outside React render jitter.
2. **Loop and seek boundaries**
   - timing stores must be reset to avoid stale grading/highlights.
3. **Media alignment**
   - DTW/chroma mapping must stay consistent with playback beat indices.

## Testing Focus

- reducer transitions (`store`),
- score-editing helper behavior (`storeScoreEditing`),
- playback timing engine (`scorePlayback`),
- alignment and DTW utilities (`videoScoreCorrelation`, `dtw`).

## Where to Extend

- Add shared theory/playback behavior to `src/shared/music` or `src/shared/playback` first.
- Keep piano-only UI and evaluation behavior in `src/piano/**`.
