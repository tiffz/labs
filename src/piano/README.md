# Piano

An interactive piano practice app: render sheet music with VexFlow, play back via sampled piano/strings, and grade live MIDI or acoustic input against the score.

Route: `/piano/`.

## Features

- **Score playback** — plays back any loaded `PianoScore` with metronome, drum, and media-layer sync.
- **Practice mode** — scores your live MIDI / acoustic input against the current measure and colors notes by accuracy.
- **Free-tempo practice** — waits for each note instead of advancing on a clock, useful for learning the notes before adding tempo.
- **Step input** — build scores one note or chord at a time with duration/dotted toggles and undo/redo.
- **Sections + measure selection** — split a score into sections and practice one at a time; select a measure range to loop.
- **MIDI + microphone input** — both modes share the same grading pipeline via `practiceTimingStore`.
- **Drums, click, media sync** — layered audio channels with per-track volume and a master mute, all routed through the shared transport.

See `ARCHITECTURE.md` in this directory for the detailed system design.

## File Layout

```text
src/piano/
├── App.tsx               # Root component; mounts PianoProvider
├── ARCHITECTURE.md       # Read this first
├── store.tsx             # Provider + reducer + audio/input wiring
├── storeTypes.ts         # PianoState / Action / initialState (extracted for clarity)
├── storeSelectors.ts     # Pure selectors on PianoState
├── types.ts              # PianoScore, Key, NoteDuration, etc.
├── components/           # ScoreDisplay, PracticeMode, PlaybackControls, ...
├── data/                 # Built-in scales and exercises
├── utils/                # scorePlayback engine, midiInput, acousticInput, practiceTimingStore
└── styles/
```

## Testing

- Unit: `npx vitest run src/piano`
- E2E smoke: covered by the shared `/piano/` smoke spec
- Store regression: `src/piano/store.test.ts` owns the reducer invariants and score-load behavior.

When adding new state, prefer putting the new field + action + default into `storeTypes.ts` and keeping the reducer + provider in `store.tsx`. This mirrors the decomposition pattern in `docs/COMPONENT_DECOMPOSITION_PATTERN.md`.

## Shared Dependencies

- `src/shared/music/pitch/acousticInput` — the shared factory; `piano/utils/acousticInput.ts` extends it with piano-specific debug hooks.
- `src/shared/notation/` — ScoreDisplay and VexFlow helpers.
- `src/shared/playback/` — transport + audio-context lifecycle.
- `src/shared/audio/clickService` — metronome.
