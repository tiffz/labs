# Count

An interactive subdivision/counting trainer. Helps musicians internalize how beat subdivisions feel at different tempi.

Route: `/count/`.

## Features

- **Subdivision selection** — pick a grid (quarters, eighths, triplets, sixteenths, etc.) and hear it mapped to a click track.
- **Tempo slider** — audio-scheduled clicks stay tight via the shared playback scheduler.
- **Pulse visualizer** — a styled beat ring under `styles/pulse.css` indicates the current subdivision; designed for peripheral-vision practice while playing an instrument.
- **Shared transport** — reuses `src/shared/playback/` so tempo, play/pause, and suspension behavior match Beat and Piano.

## Architecture

```text
src/count/
├── App.tsx              # Shell + state
├── ARCHITECTURE.md      # Current design decisions; read first if you're editing
├── FUTURE_SUBDIVISIONS.md
├── analysis/            # Subdivision pattern math
├── components/          # UI primitives specific to count
├── engine/              # Pulse scheduler / subdivision engine
├── hooks/               # State hooks
├── storage/             # Persistence for last-used subdivision & tempo
└── styles/              # Pulse and layout CSS
```

See `ARCHITECTURE.md` in this directory for the detailed engine design and timing guarantees.

## Testing

- Unit: `npx vitest run src/count`
- E2E smoke: `/count/` is covered by `e2e/smoke/app-shells.spec.ts`
- Visual regression: `e2e/visual/apps.visual.spec.ts` includes `count-desktop` and `count-mobile` baselines.

## Shared Dependencies

- `src/shared/playback/` — transport + audio context lifecycle
- `src/shared/audio/clickService` — metronome sample loading and scheduling
- `src/shared/rhythm/timeSignatureUtils` — grid math
