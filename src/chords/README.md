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

#### `chordPlayer.ts`

Audio playback engine:

- Uses Web Audio API with a singleton `AudioContext` for consistent timing
- Schedules notes beat-by-beat based on styled chord notes
- Supports multiple sound types (piano, sine, square, sawtooth, triangle)
- Piano synthesis uses multiple oscillators with harmonics and ADSR envelopes
- Implements loop ID tracking to prevent stale highlighting callbacks
- Handles graceful mid-playback updates (tempo changes immediately, others wait for measure end)

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

The `chordPlayer` sends individual start/end events for each note group, and the `App` component manages the set of active highlights.

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

#### 7. Audio Timing

Uses `AudioContext.currentTime` for scheduling to prevent slowdown when the browser tab is inactive:

- `AudioContext.currentTime` continues even when tab is backgrounded
- Provides consistent timing regardless of browser throttling
- Falls back to `setTimeout` for highlighting callbacks (less critical timing)

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
│   ├── chordPlayer.ts         # Audio playback engine
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

- `chordPlayer.test.ts`: Tests playback scheduling and highlighting callbacks
- `chordStyling.test.ts`: Tests pattern parsing and styled note generation
- `chordTheory.test.ts`: Tests Roman numeral to chord conversion

### Future Improvements

- Add more chord styling patterns
- Support for custom chord progressions
- Export functionality (MIDI, PDF, audio)
- More sophisticated voicing options
- Visual feedback for locked options
- Accessibility improvements (keyboard navigation, screen reader support)
