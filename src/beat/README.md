# Find the Beat

A web application for detecting BPM (beats per minute) in audio and video files, with synchronized drum pattern accompaniment and automatic section detection for practice.

## Features

- **BPM Detection**: Automatically analyzes audio/video files to detect tempo
- **Section Detection**: Automatically segments songs into musical sections (verse, chorus, etc.) for looped practice
- **Section Looping**: Select and loop individual sections or ranges of sections
- **Section Editing**: Combine or split detected sections at measure boundaries
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

### Analysis Pipeline (Current)

The current analysis flow combines an Essentia-powered tempo ensemble with
shared, energy-based onset detection for diagnostics and refinements:

```
Audio decode
  ├─ analyze characteristics (RMS + dynamic range)
  ├─ detect music boundaries (start/end of actual musical content)
  ├─ tempo ensemble (Essentia RhythmExtractor2013 + Percival + Loop)
  ├─ integer BPM snapping (prefer whole numbers for studio recordings)
  ├─ beat grid merge + onset snapping
  ├─ gap-based resync + fermata detection (excludes end-of-track silence)
  ├─ tempo regions (steady + fermata/rubato)
  └─ diagnostics (sectional tempo + accuracy checks in dev)
```

#### Music Boundary Detection

The analyzer detects when music actually starts and ends within a track:

- **Music Start**: Skips initial silence/noise before music begins
- **Music End**: Identifies where music ends (before trailing silence)
- Gaps after music ends are not treated as fermatas

#### Integer BPM Snapping

Most studio recordings use integer BPMs (click tracks default to whole numbers).
The detector compares alignment scores between fractional and integer BPMs,
only keeping fractional values when they align significantly better (>12%).

### Shared Analysis Utilities

We centralize onset detection and tempo helpers so diagnostics, benchmarks, and
refinements stay consistent:

- `src/beat/utils/analysis/onsets.ts` — preset-based onset detection
- `src/beat/utils/analysis/tempoUtils.ts` — shared tempo normalization helpers
- `src/beat/utils/analysis/sectionalTempo.ts` — shared sectional tempo windows

### Chord & Key Detection

The app uses HPCP (Harmonic Pitch Class Profile) analysis with Essentia.js for
chord and key detection:

- **Chord Detection**: Template matching against major/minor/7th chord profiles
- **Key Detection**: Combines chord-based analysis with Essentia KeyExtractor
- **bVI Relationship**: Recognizes when a major chord functions as bVI in a minor key
  (e.g., detects F minor instead of Db major for "Let It Go")
- **Key Changes**: Detects modulations using chord-based sectional analysis

### Experimental Detectors (Deprecated)

Older or exploratory detectors are kept under `src/beat/utils/experimental/`:

- `experimental/fermataDetector.ts` (Essentia SuperFlux-based) - **deprecated**, use `gapFermataDetector.ts` instead
- `experimental/tempoChangeDetector.ts` (windowed BPM changes) - **deprecated**

These are exported for API compatibility but are not part of the main analysis path.
The gap-based fermata detector (`gapFermataDetector.ts`) provides better results.

### File Structure

```
src/beat/
├── App.tsx                     # Main application component
├── components/
│   ├── BeatVisualizer.tsx      # Visual beat indicator (circles)
│   ├── BpmDisplay.tsx          # BPM display with +/- adjustment
│   ├── DrumAccompaniment.tsx   # Drum pattern player & editor
│   ├── MediaUploader.tsx       # File upload with drag-drop
│   ├── PlaybackBar.tsx         # Seek bar with sections & time display
│   ├── TapTempo.tsx            # Manual tap-to-tempo (disabled)
│   └── VideoPlayer.tsx         # Synced video playback
├── hooks/
│   ├── useAudioAnalysis.ts     # Audio decoding & BPM analysis
│   ├── useBeatSync.ts          # Playback state & beat tracking
│   └── useSectionDetection.ts  # Section detection state management
├── utils/
│   ├── beatAnalyzer.ts         # Essentia.js BPM detection
│   ├── beatGrid.ts             # Beat position calculations
│   └── sectionDetector.ts      # Music structure segmentation
└── styles/
    └── beat.css                # Component styles
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

### Section Detection

The app automatically detects musical section boundaries using spectral analysis:

```
┌─────────────────────────────────────┐
│     Audio Signal (mono, 44.1kHz)    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│    Spectral Feature Extraction      │
│  (energy, centroid, spread, etc.)   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│    Self-Similarity Matrix (SSM)     │
│  (compares frames to find patterns) │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│    Novelty Detection                │
│  (checkerboard kernel convolution)  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│    Boundary Refinement              │
│  (snap to measure boundaries)       │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Output: Section[], Confidence      │
│  (labeled by measure range, e.g.    │
│   "M1-8", "M9-24", "M25-32")       │
└─────────────────────────────────────┘
```

#### Section Features

- **Measure-aligned boundaries**: Sections always start and end on measure boundaries
- **Loop extension**: When looping, section boundaries extend to the nearest full measure for smoother transitions
- **Multi-selection**: Select multiple adjacent sections with Shift+click
- **Combine/Split**: Merge selected sections or split at the current playhead position

#### `useSectionDetection` Hook

```typescript
const {
  sections, // Detected Section[] array
  isDetecting, // Loading state
  confidence, // Detection confidence (0-1)
  warnings, // Detection warnings
  detectSectionsFromBuffer, // Run detection on AudioBuffer
  merge, // Merge two adjacent sections
  split, // Split section at time
} = useSectionDetection();
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

## Benchmarking & Quality Checks

The Beat Finder analysis pipeline has comprehensive BPM detection benchmarks (~2.5 minutes).
These are **excluded by default** from `npm test` but **automatically included** when beat
finder files change.

### Automatic Behavior

- **Pre-commit hook**: Detects if any `src/beat/` files are staged
  - Beat files changed → sets `INCLUDE_BEAT_BENCHMARK=true`, benchmark runs
  - No beat files → benchmark excluded (saves ~2.5 min)
- **CI workflow**: Same logic based on changed files in PR/push

### Manual Override

Force benchmarks to run regardless of file changes:

```bash
INCLUDE_BEAT_BENCHMARK=true npm test
```

### Running Benchmarks Directly

Run the synthetic BPM detection benchmark (primary quality gate):

```bash
npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
```

Run the benchmark against specific algorithms if you touched detector logic:

```bash
TEMPO_ALGORITHM=essentia npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
TEMPO_ALGORITHM=autocorrelation npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
TEMPO_ALGORITHM=ioi-histogram npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
```

Optional supporting checks:

```
npm test -- --run src/beat/utils/tempoEnsemble.test.ts
npm test -- --run src/beat/utils/onsetAlignmentScorer.test.ts
```

## Future Improvements

- [x] ~~Section detection for looped practice~~ ✓ Implemented
- [ ] Tap tempo for manual BPM input (temporarily disabled for polish)
- [ ] Beat phase adjustment (shift grid left/right)
- [ ] Time signature detection
- [ ] Waveform visualization
- [ ] Export synchronized drum track
- [ ] Save/load section edits
- [ ] Section labels (custom naming beyond measure numbers)
