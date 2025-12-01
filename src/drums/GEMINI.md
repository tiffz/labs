# Darbuka Rhythm Trainer

A web application for learning and practicing Darbuka drum rhythms with visual notation and audio playback.

## What It Does

- **Rhythm Input**: Text-based notation (D=Tak, T=Dum, K=Ka, S=Slap, \_=rest, -=duration)
- **Visual Notation**: Professional music notation via VexFlow with custom SVG drum symbols
- **Audio Playback**: Web Audio API with dynamic volume, reverb effects, and metronome
- **Time Signatures**: Support for 4/4, 3/4, 6/8, and custom beat groupings
- **Presets**: Quick-load standard Middle Eastern rhythms (Maqsum, Saeidi, Baladi, Ayoub)

## Tech Stack

- React 18 + TypeScript
- VexFlow for music notation rendering
- Web Audio API for playback
- Tailwind CSS for styling

## Key Files

- `App.tsx` - Main application component
- `components/VexFlowRenderer.tsx` - Music notation rendering
- `components/RhythmInput.tsx` - Notation input and validation
- `components/PlaybackControls.tsx` - Play/pause, BPM, metronome, settings
- `utils/rhythmPlayer.ts` - Audio scheduling and playback
- `utils/reverb.ts` - Reverb effect using impulse response
- `hooks/useNotationHistory.ts` - Undo/redo for notation
- `hooks/usePlayback.ts` - Playback state management

## Development

```bash
npm run dev          # Start dev server
npm test src/drums  # Run tests
```

For detailed architecture, see `DEVELOPMENT.md`.
