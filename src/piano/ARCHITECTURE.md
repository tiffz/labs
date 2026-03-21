# Piano Practice App — Architecture

## Overview

A browser-based piano practice tool built with React + TypeScript. Users connect a MIDI controller, select or compose exercises, and practice with real-time feedback on timing and pitch accuracy. The app renders notation using VexFlow and produces audio via the Web Audio API.

## Directory Structure

```
src/piano/
├── App.tsx                      # Root layout, keyboard shortcuts, MIDI header
├── store.tsx                    # Global state (useReducer + Context)
├── types.ts                     # Core data types, MIDI/note utilities
├── main.tsx                     # React entry point
├── index.html                   # HTML shell (loads Noto Music font)
├── styles/piano.css             # All CSS including tablet/mobile responsive
├── components/
│   ├── ScoreDisplay.tsx         # VexFlow rendering, practice overlays
│   ├── PlaybackControls.tsx     # Mode buttons, tempo, metronome, sound
│   ├── PracticeMode.tsx         # Timing evaluation logic (renderless)
│   ├── PracticeDashboard.tsx    # Run history, accuracy breakdown
│   ├── PresetLibrary.tsx        # Exercise selector (scales, arps, etc.)
│   ├── NoteInput.tsx            # Edit mode toolbar, ABC input
│   ├── PianoKeyboard.tsx        # On-screen keyboard, chord buffering
│   ├── VideoPlayer.tsx          # Video/audio media player, analysis UI, sync
│   └── MidiPanel.tsx            # (Dead code — moved to header)
├── data/
│   └── scales.ts                # Exercise generation (scales, arpeggios, chromatic)
└── utils/
    ├── scorePlayback.ts         # ScorePlaybackEngine (audio scheduling)
    ├── midiInput.ts             # Web MIDI API wrapper
    ├── practiceTimingStore.ts   # High-precision timing singleton
    ├── dtw.ts                   # Dynamic Time Warping (Sakoe-Chiba band)
    ├── scoreChroma.ts           # Synthetic chromagram from PianoScore
    └── videoScoreCorrelation.ts # DTW-based video/audio-to-score alignment
```

Also used (in `src/beat/utils/`):

```
src/beat/utils/
└── chromaExtractor.ts           # HPCP chroma extraction via Essentia.js
```

## Design Principles

### 1. Timing Accuracy Above All Else

The most critical path in this app is measuring the time difference between when a user presses a key and when a note was expected to be played. Two architectural decisions serve this:

- **`practiceTimingStore.ts`** is a plain-JS module-level `Map`, not React state. MIDI timestamps are recorded _synchronously_ inside the MIDI callback, and expected note times are recorded _synchronously_ inside the audio engine's `requestAnimationFrame` tick. This completely bypasses React's async rendering pipeline, eliminating jitter from batched state updates and effect scheduling.

- **High-resolution timestamps** use `performance.now()` (sub-millisecond on most browsers) for MIDI events and wall-clock projection from `AudioContext.currentTime` for expected notes.

### 2. Pure Reducer for Predictable State

All state lives in a single `useReducer` in `store.tsx`. The reducer is a pure function — no side effects, no async. This makes it trivially testable and ensures every state transition is deterministic.

Side effects (audio playback, MIDI I/O, network) are handled in the `PianoProvider` component's `useCallback`/`useEffect` hooks, which dispatch actions back to the reducer. This follows the "effects at the edges" pattern.

### 3. Renderless Practice Logic

`PracticeMode.tsx` renders `null`. It's a pure logic component that reads state via `usePiano()` and dispatches results. This separation keeps the evaluation algorithms (timed practice, free tempo, grace periods) isolated from any rendering concerns.

### 4. Score as Immutable Data

`PianoScore` is a plain serializable object. Every edit creates a new object (immutable updates), enabling a simple undo/redo stack — just an array of previous scores.

## Key Architecture Decisions

### Generation Counter for Async Safety

The playback engine and the store both maintain a "generation counter" (`playbackGenRef` in the store, `this.generation` in the engine). Every async operation captures the current generation at start time and checks it before applying results. This prevents stale callbacks from previous playback sessions from corrupting state — a critical concern when the user rapidly toggles play/stop.

### Grace Period for Missed Notes

When the playback cursor advances past a note, it doesn't immediately mark it as "missed." Instead, the note enters `recentlyPassedRef` with a timestamp. A 50ms interval timer checks whether the grace period (200ms) has elapsed. If MIDI input arrives within the grace period that matches the note, it's scored as a (potentially late) hit instead of a miss. This compensates for the inherent race between audio scheduling and MIDI input processing.

### Score-Aware Hand Splitting

Rather than a fixed MIDI 60 cutoff to determine left/right hand, practice evaluation uses proximity-based matching: a played pitch must be within 12 semitones of an expected pitch to be considered an "attempt" at that note. This allows exercises that cross the traditional hand boundary to be evaluated correctly.

### Loop Boundary Management

At loop boundaries, three things must happen atomically:

1. `clearExpectedTimes()` — wipe stale expected note timestamps
2. `refreshHeldNotes(performance.now())` — reset MIDI key timestamps for notes that are held across the boundary
3. `expectedByPartRef.current = new Map()` — prevent stale notes from being pushed to the grace-period buffer

These are called synchronously within the engine's `tick()` method (steps 1-2) and the store's `currentRunStartTime` effect (step 3), ensuring no timing data leaks between loop iterations.

### Chord Buffering

Both the on-screen keyboard and MIDI input use an 80ms debounce buffer. When multiple keys are pressed within the buffer window, they're grouped into a single `STEP_INPUT_CHORD` action. This handles the physical reality that even "simultaneous" key presses have slight temporal offset.

### VexFlow Rendering Strategy

`ScoreDisplay` uses VexFlow for notation rendering. Key decisions:

- **`Formatter({ softmaxFactor: 5 })`** for proportional note spacing
- **`Beam.generateBeams()`** called _before_ `voice.draw()` to suppress individual flags on beamed notes
- **Proportional measure widths** based on note density, with compensation for header elements (clef, key/time signature) in the first measure
- **SVG overlays** for dynamic feedback (ghost notes for early/late, invisible rects with `<title>` for hover tooltips) — these are appended directly to VexFlow's SVG container rather than using a separate overlay layer
- **Scroll preservation** via temporarily setting `overflow-y: hidden` during DOM manipulation to prevent browser-induced scroll resets

### Shared Playback Infrastructure

Audio instruments (`PianoSynthesizer`, `SimpleSynthesizer`, `SampledPiano`) live in `src/shared/playback/` and are shared with the chord progression generator app. The `ScorePlaybackEngine` creates instrument instances on demand and manages their lifecycle (connect/disconnect/stopAll).

### Video/Audio-to-Score Synchronization

When users upload a video or audio file, the app helps align the recording with the score using a combination of automatic detection and manual tools:

1. **Music start detection**: Analyzes the audio's RMS energy to find where the music begins (skipping silence, title cards, etc.). This detected "music start" time becomes the initial offset.

2. **BPM detection**: Uses the beat analysis pipeline to detect the recording's tempo and suggest adjustments if it differs significantly from the score BPM.

3. **Tap to align**: Since automatic alignment can't reliably handle arbitrary recordings (different arrangements, intros, etc.), the app provides a "Tap to align" feature. The user plays the audio and taps a button on beat 1 of measure 1 — this instantly sets the offset to the current playback time. This is fast (~2 seconds of effort) and 100% reliable.

4. **Manual offset slider**: Fine-tune the offset in 0.1s increments for precise alignment.

**Playback sync strategy**: The media plays at its original speed (`playbackRate = 1`). At playback start, the player seeks to `offset + sectionOffset`. After that initial seek, the media plays untouched — no tempo changes, no periodic drift correction. The only re-seek happens on loop boundaries (detected when `currentBeat` jumps backward). This keeps the original recording perfectly intact and eliminates jitter.

**BPM suggestion**: If the detected BPM differs from the score BPM by more than 5%, the app suggests adjusting the score's tempo.

**Note**: `dtw.ts`, `scoreChroma.ts`, and `chromaExtractor.ts` still exist in the codebase for potential future use (e.g., advanced section-level analysis).

## Performance Considerations

- **Memoized re-renders**: `ScoreDisplay` computes a `stateKey` hash and skips re-rendering if nothing meaningful changed (note content, practice results, position, ghost notes)
- **RAF-based scheduling**: Audio events are scheduled 200ms ahead using `requestAnimationFrame`, balancing latency with scheduling reliability
- **Metronome deduplication**: Click times are tracked by rounded millisecond key with a 50ms minimum gap to prevent double-clicks at loop boundaries
- **Music start detection**: Simple RMS scan with 50ms windows — near-instant even for long files.
- **Smooth video playback**: Media plays at native speed with a single seek at playback start. No `playbackRate` manipulation or periodic drift correction — the only re-seek is on loop restart.

## Responsive Design

The CSS uses three tiers:

- **Desktop** (>1200px): Full sidebar (300px), standard touch targets
- **Tablet** (769px–1200px): Narrower sidebar (260px), 44px minimum touch targets, larger piano keys, `touch-action: manipulation` to eliminate tap delay
- **Mobile** (<768px): Stacked layout, sidebar becomes full-width bottom panel

## Testing Strategy

Tests focus on the pure-logic modules that don't require DOM or audio:

- **`practiceTimingStore.test.ts`** — Singleton timing store operations
- **`types.test.ts`** — MIDI conversion utilities, duration calculations
- **`scales.test.ts`** — Exercise generation invariants (measure fullness, fingering, direction)
- **`store.test.ts`** — Reducer state transitions (30+ cases covering edit, undo/redo, practice runs, accuracy)
- **`dtw.test.ts`** — DTW algorithm correctness: identical/stretched sequences, distance functions, band constraints, monotonicity
- **`scoreChroma.test.ts`** — Chromagram generation: frame rate, pitch-class placement, L2 normalization, multi-part handling
- **`videoScoreCorrelation.test.ts`** — `lookupAudioTime` binary search/interpolation: edge cases (empty, single-point, clamping), large mappings

Components that depend on VexFlow, Web Audio, or Web MIDI are validated through manual testing with a connected MIDI controller. The `chromaExtractor` (Essentia.js WASM) is integration-tested manually because it requires the Essentia WASM runtime.
