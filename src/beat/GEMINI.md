# Find the Beat

A web application for detecting BPM in audio and video files, with synchronized drum pattern accompaniment and automatic section detection for practice.

## What It Does

- **BPM Detection**: Automatic tempo analysis using Essentia.js (WASM)
- **Section Detection**: Segments songs into musical sections for looped practice
- **Section Looping**: Select and loop individual sections or ranges
- **Playback Speed**: Slow down to 50%, 75%, 90%, or 95% speed
- **Volume Mixer**: Independent controls for audio, drums, and metronome
- **Drum Accompaniment**: Play along with Middle Eastern drum patterns
- **Video Sync**: Video playback synchronized with audio analysis

## Tech Stack

- React 18 + TypeScript
- Essentia.js (WASM) for BPM detection
- Web Audio API for playback and mixing
- VexFlow (via shared DrumNotationMini) for drum notation
- Tailwind CSS for styling

## Key Files

- `App.tsx` - Main application component
- `components/BeatVisualizer.tsx` - Visual beat indicator
- `components/BpmDisplay.tsx` - BPM display with adjustment
- `components/DrumAccompaniment.tsx` - Drum pattern player
- `components/PlaybackBar.tsx` - Seek bar with sections
- `components/VideoPlayer.tsx` - Synced video playback
- `hooks/useAudioAnalysis.ts` - Audio decoding & BPM analysis
- `hooks/useBeatSync.ts` - Playback state & beat tracking
- `hooks/useSectionDetection.ts` - Section detection state
- `utils/beatAnalyzer.ts` - Essentia.js BPM detection
- `utils/beatGrid.ts` - Beat position calculations
- `utils/sectionDetector.ts` - Music structure segmentation
- `utils/analysis/` - Shared onset detection and tempo utilities

## Development

```bash
npm run dev         # Start dev server
npm test src/beat   # Run tests (excludes benchmarks)
```

## Benchmarks

BPM detection benchmarks take ~2.5 minutes and are excluded by default:

```bash
# Force benchmarks to run
INCLUDE_BEAT_BENCHMARK=true npm test

# Run benchmark directly
npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
```

Pre-commit hooks automatically include benchmarks when `src/beat/` files are staged.

## Architecture Notes

### Analysis Pipeline

```
Audio decode
  ├─ analyze characteristics (RMS + dynamic range)
  ├─ detect music boundaries (start/end of actual content)
  ├─ tempo ensemble (RhythmExtractor2013 + Percival + Loop)
  ├─ integer BPM snapping (prefer whole numbers)
  ├─ beat grid merge + onset snapping
  ├─ gap-based fermata detection
  └─ tempo regions (steady + fermata/rubato)
```

### Key Classes

- **BeatGrid**: Converts between time (seconds) and musical position
- **Section**: Represents a detected musical section with measure boundaries

### Shared Dependencies

Uses utilities from `src/shared/`:

- `rhythm/` - Rhythm parsing and time signature utilities
- `audio/` - AudioPlayer for drum sounds
- `notation/` - DrumNotationMini for displaying patterns

See README.md for detailed architecture documentation.
