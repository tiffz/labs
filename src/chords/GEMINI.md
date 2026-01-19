# Chord Progression Generator

A React-based web application for generating and playing chord progressions with customizable styling, time signatures, and voicings.

## What It Does

- **Chord Generation**: Random or manual chord progression creation
- **Music Notation**: VexFlow-rendered grand staff (treble + bass clef)
- **Audio Playback**: Web Audio API with drift-free timing architecture
- **Styling Patterns**: Multiple rhythm patterns (block chords, arpeggios, etc.)
- **URL State**: Shareable URLs for specific progressions
- **Live Editing**: Tempo changes apply immediately, other changes at measure boundaries

## Tech Stack

- React 18 + TypeScript
- VexFlow for music notation rendering
- Web Audio API for playback (custom playback engine)
- Tailwind CSS for styling

## Key Files

- `App.tsx` - Main application component with state management
- `components/ChordScoreRenderer.tsx` - VexFlow notation rendering
- `components/ManualControls.tsx` - Sidebar UI controls
- `utils/playback/playbackEngine.ts` - Central audio orchestrator
- `utils/playback/transport.ts` - Drift-free time management
- `utils/playback/track.ts` - Track layer (events, instrument, gain)
- `utils/playback/instruments/` - Pluggable instrument architecture
- `utils/chordTheory.ts` - Roman numeral to chord conversion
- `utils/chordStyling.ts` - Pattern parsing and styled note generation
- `utils/chordVoicing.ts` - Chord voicing generation
- `data/chordProgressions.ts` - Common chord progressions
- `data/chordStylingPatterns.ts` - Human-readable rhythm patterns
- `hooks/useUrlState.ts` - URL state synchronization

## Development

```bash
npm run dev           # Start dev server
npm test src/chords   # Run tests
```

## Architecture Notes

### Playback System

The playback engine uses a drift-free architecture where all timing is derived from `AudioContext.currentTime`, never stored as state. This prevents timing drift over long playback sessions.

Key design decisions:

- **Transport**: Time always calculated, never accumulated
- **Tracks**: Each track has its own instrument, events, and gain
- **Instruments**: Pluggable architecture (PianoSynth, SimpleSynth)
- **Scheduling**: 150ms lookahead for robust tab-backgrounding support

### Pattern System

Chord rhythm patterns use a human-readable notation:

- `C`: Full chord
- `1`, `3`, `5`: Root, third, fifth
- `_`: Rest
- `-`: Continuation

See README.md for detailed architecture documentation.
