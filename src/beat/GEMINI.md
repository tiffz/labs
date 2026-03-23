# Find the Beat

A web app for music-practice analysis with local files and YouTube playback.

## What It Does

- BPM + key analysis for local files
- Generated analysis sections and editable practice lanes
- Looping, splitting, combining, and measure-aware nudging
- Manual BPM/sync controls for YouTube videos
- Independent audio/drums/metronome mixer controls
- Persistent library + cached analysis bundles

## Tech Stack

- React 18 + TypeScript
- MUI (`@mui/material`) for high-interaction form/menu controls
- Essentia.js (WASM) for BPM detection
- Web Audio API for playback and mixing
- VexFlow (via shared DrumNotationMini) for drum notation
- Route-local CSS in `styles/beat.css`

## Key Files

- `App.tsx` - Beat Finder app shell + state orchestration
- `components/PlaybackBar.tsx` - Timeline ruler + generated/practice lanes
- `components/YouTubePlayer.tsx` / `components/VideoPlayer.tsx` - media playback
- `hooks/useAudioAnalysis.ts` - local-file analysis state
- `hooks/useBeatSync.ts` - transport, mixer, and sync playback state
- `storage/beatLibraryService.ts` + `storage/beatLibraryDb.ts` - persistence
- `utils/analysisPipeline.ts` - analysis pipeline entry point
- `utils/keyboardShortcuts.ts` - global keyboard guard logic

## Development

```bash
npm run dev         # Start dev server
npm test src/beat   # Run tests (excludes benchmarks)
```

## Architecture References

- `ARCHITECTURE.md` describes lane model, timeline coordinate rules, and UI
  state boundaries.
- `README.md` contains fuller analysis pipeline and benchmark notes.
