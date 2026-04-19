# Scales

A scale-practice companion: pick a scale, key, and tempo; hear and see it played back; practice against live MIDI or acoustic input with per-note grading.

Route: `/scales/`.

## Features

- **Scale catalog** — major, minor, pentatonic, modal, and custom scales drawn from the shared music catalog.
- **Key + range selection** — transpose any scale to any key and choose how many octaves to practice.
- **Tempo control + metronome** — shares the global transport with Piano and Beat.
- **MIDI + acoustic input** — same grading pipeline as Piano; see "Shared Dependencies" below.
- **Visual + audio feedback** — highlights the target note and flags incorrect notes in real time.

## File Layout

```text
src/scales/
├── App.tsx              # Shell + state
├── App.test.tsx         # Unit tests
├── store.tsx            # App-local store
├── components/          # Scale pickers, indicator, practice controls
├── curriculum/          # Curriculum / lesson plan data
├── progress/            # Persistence for per-user progress
├── utils/               # Scales grading + scales-side AcousticInput extension
└── styles/
```

## Testing

- Unit: `npx vitest run src/scales`
- E2E smoke: `/scales/` is covered by `e2e/smoke/app-shells.spec.ts`
- Visual regression: `apps.visual.spec.ts` includes `scales-desktop` and `scales-mobile` baselines

## Shared Dependencies

- `src/shared/music/scales/` — scale definitions and transposition
- `src/shared/music/pitch/acousticInput` — shared acoustic input; `scales/utils/acousticInput.ts` extends it with scales-specific options
- `src/shared/playback/` — transport
- `src/shared/audio/clickService` — metronome

## Notes for Contributors

If you add a new scale type, add it to the shared `music/scales/` catalog rather than to app-local data so Piano can consume it too. The import-boundary test (`src/shared/importBoundaries.test.ts`) will flag any direct cross-app imports.
