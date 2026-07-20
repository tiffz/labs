# Count

**Before new UI:** search shared controls at [`/ui/`](/ui/) · copy: [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md)

An interactive subdivision/counting trainer. Helps musicians internalize how beat subdivisions feel at different tempi.

Route: `/count/`.

## Features

- **Subdivision selection** — pick a grid (quarters, eighths, triplets, sixteenths, etc.) and hear it mapped to a click track.
- **Tempo slider** — always-visible Count `BpmControl` (not compact shared `BpmInput`); audio-scheduled clicks stay tight via the shared playback scheduler.
- **Pulse visualizer** — a styled beat ring under `styles/pulse.css` indicates the current subdivision; designed for peripheral-vision practice while playing an instrument.
- **Shared transport** — reuses `src/shared/playback/` so tempo, play/pause, and suspension behavior match Beat and Piano.

## Intentional diversions

| Surface             | Shared alternative                            | Why Count keeps its own                                                                                                                                                                    |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tempo               | `BpmInput` (portable toolbar field + menu)    | Metronome practice needs **immediate** BPM editing — slider, ±1 hold-repeat, ÷2/×2, common presets, and tempo marking — with **no menu** hiding the input. Portability is not a goal here. |
| Channel mixer gains | `AppLinearVolumeSlider` / `PlaybackVolumeRow` | Subdivision mixer is a dense first-class mix grid (per-channel V/C/D mutes + hierarchy labels). Keep native pulse styling unless product asks to restyle.                                  |

Do **not** “adopt shared BpmInput for consistency” without an explicit product decision. See [`SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md) § First-class vs portable.

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
