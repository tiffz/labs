# Chord Progression Generator

A React-based web application for generating and playing chord progressions with customizable styling, time signatures, and voicings.

## Architecture Overview

### Core Components

#### `App.tsx`

The main application component that manages:

- Global state (progression, key, tempo, time signature, styling strategy, voicing options)
- Playback state (isPlaying, activeNoteGroups for highlighting)
- URL state synchronization for sharing/saving progressions
- Keyboard shortcuts (spacebar for play/stop)
- Dynamic playback updates (tempo changes immediately, other changes wait for measure end)

#### `ChordScoreRenderer.tsx`

Renders the musical notation using VexFlow:

- Creates grand staff (treble + bass clef) with proper measure formatting
- Handles note alignment using VexFlow's `joinVoices` API
- Implements conservative format width calculations to prevent notes from escaping measures
- Supports beaming for eighth notes based on time signature
- Highlights active notes during playback using a `Set<string>` of note group keys

#### `ManualControls.tsx`

Sidebar UI for controlling generation parameters:

- Chip-based inline editing interface
- Time signature tabs with visual selection
- Chord styling previews with VexFlow-rendered examples
- Lock/unlock functionality for randomization control
- Dice icons for section-specific randomization

#### `utils/playback/` - Audio Playback System

A modular, stable playback system designed from the ground up to eliminate timing drift, audio glitches, and playback failures. The architecture separates concerns into distinct layers, each with a single responsibility.

##### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PlaybackEngine                          │
│  (Orchestrates all components, handles live editing)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────────┐
    │Transport │   │  Track   │   │    Scheduler     │
    │  (Time)  │   │ (Events) │   │   (Lookahead)    │
    └────┬─────┘   └────┬─────┘   └──────────────────┘
         │              │
         │              ▼
         │        ┌──────────┐
         │        │Instrument│
         │        │ (Sound)  │
         │        └────┬─────┘
         │             │
         ▼             ▼
    ┌───────────────────────────────────────┐
    │          AudioContext                 │
    │   (Single source of truth for time)   │
    └───────────────────────────────────────┘
```

##### Core Components

- **`transport.ts`**: Time management layer
  - Position is **always derived** from `AudioContext.currentTime` (never stored as state)
  - Handles tempo changes by recalculating `startTime` to maintain beat position
  - Loop detection via direct calculation: `Math.floor(totalBeatsElapsed / loopDuration)`
  - Converts beat positions to absolute AudioContext times for scheduling

- **`track.ts`**: Track layer encapsulating events + instrument + gain
  - Each track maintains its own note events, instrument instance, and gain control
  - Tracks share the same Transport (synchronized to the same clock)
  - Handles scheduling state per-loop to prevent double-scheduling
  - Supports hot-swapping instruments during playback

- **`instruments/`**: Pluggable instrument architecture
  - `Instrument` interface decouples scheduling from sound generation
  - `BaseInstrument` provides common functionality (gain control, graceful stopping)
  - `PianoSynthesizer`: Multi-oscillator synthesis with harmonics and ADSR envelopes
  - `SimpleSynthesizer`: Basic waveforms (sine, square, sawtooth, triangle)
  - Future-ready for sampled instruments, FM synthesis, drum machines

- **`playbackEngine.ts`**: Central orchestrator
  - Manages Transport, Tracks, and audio chain (master gain → compressor → destination)
  - Runs two separate loops: **scheduler** (setInterval) and **UI** (requestAnimationFrame)
  - Implements live editing strategies for different parameter types
  - Handles pending changes queue for measure-boundary updates

##### Key Stability Guarantees

1. **No Timing Drift**: All timing derived from `AudioContext.currentTime`, never accumulated state
2. **Sample-Accurate Scheduling**: Notes scheduled via Web Audio API, not JavaScript timers
3. **Graceful Degradation**: AudioContext suspension handled (tab backgrounding)
4. **Clean Audio Stops**: Fade-outs via `linearRampToValueAtTime`, gain restored via Web Audio scheduling
5. **Loop Boundary Safety**: Per-loop scheduling state prevents double-scheduling or missed notes

### Key Design Decisions

#### 1. Pattern-Based Chord Styling System

Chord rhythm patterns are defined in `chordStylingPatterns.ts` using a human-readable notation:

- `C`: Full chord
- `1`, `3`, `5`: Root, third, fifth of the chord
- `_`: Rest
- `-`: Continuation of previous note

This makes it easy to add new patterns and understand existing ones without diving into complex duration calculations.

#### 2. Highlighting Architecture

Note highlighting uses a `Set<string>` approach where each active note group is tracked by a key like `"measureIndex:treble:groupIndex"`. This allows:

- Multiple simultaneous highlights (e.g., long bass note + short treble notes)
- Simple add/remove operations
- Easy filtering by loop ID to prevent stale highlights

The playback engine sends position updates to the UI via a callback, and the `App` component manages the set of active highlights.

#### 3. Playback Update Strategy

- **Tempo changes**: Apply immediately via `updateTempo()` - affects the next loop
- **Other changes** (progression, key, styling, time signature): Queue via `updatePlayback()` - applies after current measure finishes
- **Sound type changes**: Apply immediately - doesn't affect timing

This provides responsive tempo control while ensuring other changes don't cause jarring transitions mid-measure.

#### 4. VexFlow Format Width Calculation

To prevent notes from escaping measures, we use very conservative format width calculations:

- First measure: `150px + (keySig.count × 12px) + (25-50px for note count) + (20px if complex key)`
- Other measures: `80px + (30-60px for note count)`
- Minimum format width: `30px`

This ensures VexFlow's formatter has enough space to fit all notes within measure boundaries.

#### 5. URL State Synchronization

The `useUrlState` hook synchronizes application state with URL query parameters:

- Enables sharing/saving specific progressions
- Supports browser back/forward navigation
- Only stores non-default values to keep URLs clean

#### 6. Locking System

Locking prevents randomization but allows manual changes:

- Locked options are excluded from the main "Randomize" button
- Transpose buttons remain enabled even when key is locked (locking is for randomization, not manual control)
- Locking a styling strategy prevents rolling incompatible time signatures

#### 7. Playback System Architecture (Deep Dive)

The playback system was designed to eliminate common audio bugs. Here's why each decision was made:

##### Problem: Timing Drift After Long Playback

**Root cause**: Storing beat position as state and incrementing it each tick. Small floating-point errors accumulate over time, causing the playback to fall out of sync after many loops.

**Solution**: Never store beat position. Always derive it:

```typescript
getPositionInBeats(): number {
  const elapsed = audioContext.currentTime - this.startTime;
  return (elapsed * (tempo / 60)) % loopDurationBeats;
}
```

Loop count is similarly derived: `Math.floor(totalBeatsElapsed / loopDurationBeats)`

##### Problem: Notes Going Silent During Playback

**Root cause**: Early cleanup of scheduled audio nodes, or gain being stuck at 0 after a fade-out.

**Solution**:

1. Schedule gain restoration using Web Audio API timing (not setTimeout):

```typescript
gain.linearRampToValueAtTime(0, now + fadeTime);
gain.setValueAtTime(1, now + fadeTime + 0.001); // Restore precisely
```

2. Don't `stopAll()` on tempo changes—let notes finish naturally
3. Per-loop scheduling state (`lastLoopScheduled`) prevents double-scheduling

##### Problem: "Crashing" Sounds When Changing Parameters

**Root cause**: Stopping all audio abruptly, or scheduling notes at wrong times during parameter transitions.

**Solution**: Different strategies for different parameter types:

- **Tempo**: Update immediately, recalculate `startTime` to maintain position, reset scheduling
- **Sound type**: Fade out (50ms), swap instruments, reset scheduling
- **Content changes**: Queue for next measure boundary to avoid mid-measure transitions

##### Problem: Audio Glitches When Tab Loses Focus

**Root cause**: Browser throttles `setInterval` when tab is backgrounded, causing scheduling gaps.

**Solution**:

- Use lookahead scheduling (150ms ahead) so notes are pre-scheduled before throttling kicks in
- Schedule using absolute `AudioContext.currentTime` (continues regardless of tab state)
- Handle `AudioContext.state === 'suspended'` by calling `ctx.resume()`

##### Multi-Track Architecture

Designed for future expansion (drums, melody, etc.):

- Each `Track` has its own instrument, events, and gain control
- All tracks share the same `Transport` (single source of truth for time)
- Instruments implement a common interface, allowing hot-swapping
- Audio chain: `Instrument → Track Gain → Master Gain → Compressor → Destination`

### File Structure

```
src/chords/
├── App.tsx                    # Main application component
├── components/
│   ├── ChordScoreRenderer.tsx # VexFlow notation renderer
│   ├── ChordStylePreview.tsx  # Preview component for styling options
│   ├── ManualControls.tsx     # Sidebar controls UI
│   └── OptionChip.tsx         # Reusable chip component
├── data/
│   ├── chordProgressions.ts   # Common chord progressions
│   ├── chordStylingPatterns.ts # Human-readable rhythm patterns
│   └── chordStylingStrategies.ts # Styling strategy metadata
├── hooks/
│   └── useUrlState.ts         # URL state synchronization hook
├── types/
│   ├── index.ts               # TypeScript type definitions
│   └── soundOptions.ts        # Sound type definitions
├── utils/
│   ├── playback/              # Audio playback system
│   │   ├── playbackEngine.ts  # Central orchestrator (scheduler, UI loops)
│   │   ├── transport.ts       # Time management (drift-free timing)
│   │   ├── track.ts           # Track layer (events, instrument, gain)
│   │   ├── types.ts           # Shared type definitions
│   │   └── instruments/       # Sound generation
│   │       ├── instrument.ts  # Instrument interface + BaseInstrument
│   │       ├── pianoSynth.ts  # Multi-oscillator piano synthesis
│   │       ├── simpleSynth.ts # Basic waveform synthesis
│   │       └── index.ts       # Re-exports
│   ├── chordStyling.ts        # Pattern parsing and styled note generation
│   ├── chordTheory.ts         # Roman numeral to chord conversion
│   ├── chordVoicing.ts        # Chord voicing generation with octave constraints
│   ├── durationValidation.ts  # Duration calculation utilities
│   ├── keySignature.ts        # Key signature calculation
│   ├── keyTransposition.ts    # Key transposition utilities
│   ├── randomization.ts       # Random generation utilities
│   └── stylingCompatibility.ts # Time signature compatibility checks
└── styles/
    └── chords.css             # Application-specific styles
```

### Testing

Unit tests are located in `src/chords/utils/*.test.ts`:

- `chordStyling.test.ts`: Tests pattern parsing and styled note generation
- `chordTheory.test.ts`: Tests Roman numeral to chord conversion

### Future Improvements

- Add more chord styling patterns
- Support for custom chord progressions
- Export functionality (MIDI, PDF, audio)
- More sophisticated voicing options
- Visual feedback for locked options
- Accessibility improvements (keyboard navigation, screen reader support)
