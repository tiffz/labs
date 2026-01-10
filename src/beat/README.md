# Find the Beat

A web application for detecting BPM (beats per minute) in audio and video files, with synchronized drum pattern accompaniment.

## Features

- **BPM Detection**: Automatically analyzes audio/video files to detect tempo
- **Confidence Scoring**: Reports detection confidence with detailed warnings
- **Playback Speed Control**: Slow down playback to 50%, 75%, 90%, or 95% speed
- **Volume Mixer**: Independent volume controls for audio, drums, and metronome click
- **Drum Accompaniment**: Play along with customizable Middle Eastern drum patterns
- **Multi-Measure Patterns**: Support for complex, multi-measure drum loops
- **Video Sync**: Video playback stays synchronized with audio analysis
- **Navigation Controls**: Skip to start/end, jump forward/back by measure

## Architecture

### BPM Detection

The app uses [**Essentia.js**](https://essentia.upf.edu/essentiajs.html) for tempo detection - the JavaScript/WASM port of the industry-standard Essentia library developed by the Music Technology Group at Universitat Pompeu Fabra (MTG/UPF).

#### RhythmExtractor2013 Algorithm

We use the `RhythmExtractor2013` algorithm with the `multifeature` method, which combines multiple beat tracking approaches:

- Onset detection based on high-frequency content
- Complex-domain spectral difference function
- Energy-based periodicity analysis

```
┌─────────────────────────────────────┐
│     Audio Signal (mono, 44.1kHz)    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Essentia.js RhythmExtractor2013    │
│  (multifeature beat tracker)        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Output: BPM, Confidence, Beats[]   │
└─────────────────────────────────────┘
```

#### Why Essentia.js?

| Feature        | Essentia.js           | Previous (web-audio-beat-detector) |
| -------------- | --------------------- | ---------------------------------- |
| Accuracy       | High (research-grade) | Moderate                           |
| Algorithm      | RhythmExtractor2013   | FFT + autocorrelation              |
| Bundle Size    | ~1.5MB (WASM)         | ~50KB                              |
| Beat Positions | Actual detected beats | Generated from BPM                 |
| Origin         | MTG/UPF research lab  | Community project                  |

Essentia.js provides significantly better accuracy, especially for:

- Music without strong drum beats
- Complex rhythmic patterns
- World music and non-Western genres
- Variable tempo or rubato performances

### Audio Characteristics Analysis

Before BPM detection, the audio is analyzed for:

- **Overall RMS energy** - Detects quiet audio that's hard to analyze
- **Dynamic range** - Measures variation between quiet and loud sections

This generates helpful warnings like:

- "Very quiet audio - detection may be less accurate"
- "Low dynamic range - may be ambient or heavily compressed"

### File Structure

```
src/beat/
├── App.tsx                 # Main application component
├── components/
│   ├── BeatVisualizer.tsx  # Visual beat indicator (circles)
│   ├── BpmDisplay.tsx      # BPM display with +/- adjustment
│   ├── DrumAccompaniment.tsx # Drum pattern player & editor
│   ├── MediaUploader.tsx   # File upload with drag-drop
│   ├── PlaybackBar.tsx     # Seek bar with time display
│   ├── TapTempo.tsx        # Manual tap-to-tempo (disabled)
│   └── VideoPlayer.tsx     # Synced video playback
├── hooks/
│   ├── useAudioAnalysis.ts # Audio decoding & BPM analysis
│   └── useBeatSync.ts      # Playback state & beat tracking
├── utils/
│   ├── beatAnalyzer.ts     # Essentia.js BPM detection
│   └── beatGrid.ts         # Beat position calculations
└── styles/
    └── beat.css            # Component styles
```

### Key Hooks

#### `useAudioAnalysis`

Handles media file decoding and BPM analysis:

```typescript
const {
  isAnalyzing, // Loading state
  analysisResult, // BPM, confidence, warnings, beats[]
  audioBuffer, // Decoded audio for playback
  analyzeMedia, // Analyze a file
  setBpm, // Manual BPM override
} = useAudioAnalysis();
```

#### `useBeatSync`

Manages synchronized playback with beat tracking and volume control:

```typescript
const {
  isPlaying,
  currentBeat, // 0-indexed beat in measure
  currentMeasure, // Current measure number
  playbackRate, // Speed (0.5 - 1.0)
  audioVolume, // 0-100
  metronomeVolume, // 0-100
  play,
  pause,
  stop,
  seek,
  seekByMeasures, // Jump +/- N measures
  setAudioVolume,
  setMetronomeVolume,
} = useBeatSync({ audioBuffer, bpm, timeSignature });
```

### Beat Grid

The `BeatGrid` class converts between time (seconds) and musical position:

```typescript
const grid = new BeatGrid(bpm, timeSignature, startOffset);

// Time → Position
const pos = grid.getPosition(currentTimeSeconds);
// { measure: 4, beat: 2, sixteenth: 0, progress: 0.5 }

// Position → Time
const time = grid.getTime({ measure: 4, beat: 0, sixteenth: 0, progress: 0 });
// 8.0 (seconds)
```

## Shared Dependencies

This app uses shared utilities from `src/shared/`:

- **`rhythm/`** - Rhythm parsing and time signature utilities
- **`audio/`** - AudioPlayer for drum sounds
- **`notation/`** - DrumNotationMini for displaying patterns

## Drum Pattern Integration

The DrumAccompaniment component:

1. Parses rhythm notation (e.g., `D-T-__T-D---T---`)
2. Syncs playback to the detected beat grid
3. Supports pasting Darbuka Trainer URLs to import patterns
4. Displays notation using VexFlow via DrumNotationMini
5. Shows metronome beat dots when click is enabled

### URL Import

Users can paste URLs from the Darbuka Trainer app:

```
/drums?rhythm=D-T-__T-D---T---&bpm=140&time=4/4
```

The rhythm parameter is automatically extracted and loaded.

## Browser Support

Requires browsers with:

- Web Audio API
- WebAssembly (WASM) support
- AudioContext.decodeAudioData()
- OfflineAudioContext (for video audio extraction)

Most modern browsers (Chrome, Firefox, Safari, Edge) are supported.

## Known Limitations

1. **Video codec support** varies by browser - MP4 with H.264/AAC works best
2. **First analysis** may be slightly slower as the WASM module loads (~1.5MB)
3. **Very long files** (>10 minutes) may take several seconds to analyze
4. **Polyrhythmic or variable tempo** music may show lower confidence

## Future Improvements

- [ ] Tap tempo for manual BPM input (temporarily disabled for polish)
- [ ] Beat phase adjustment (shift grid left/right)
- [ ] Time signature detection
- [ ] Waveform visualization
- [ ] Export synchronized drum track
