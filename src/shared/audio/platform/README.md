# Shared audio platform

Unified clocks, look-ahead scheduling, mix bus, drum players, and metronome UI for Labs music apps.

**Agent entry:** [`docs/SHARED_AUDIO_PLATFORM.md`](../../../../docs/SHARED_AUDIO_PLATFORM.md) · ADR [0021](../../../../docs/adr/0021-shared-audio-platform.md)

## Layout

| Directory     | Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| `clocks/`     | `AudioClockSource` implementations — master, loop transport, score, media timeline |
| `scheduling/` | `LookAheadAudioScheduler`, `scheduleDrumPatternWindow`, drum adapters              |
| `mix/`        | `LabsAudioMixBus`, `useAudioMixBus`                                                |
| `players/`    | `createDrumAudioPlayer` factory                                                    |
| `metronome/`  | Preferences, `MetronomeRuntimeCoordinator`, split control UI                       |
| `hooks/`      | Media-timeline metronome + drum schedulers                                         |

## Rules

1. **Grid-aligned audio** → look-ahead on `AudioContext.currentTime` via `PreciseScheduler` / `LookAheadAudioScheduler`.
2. **Never** fire samples on React state beat crossings (`playClickSampleAt(ctx, sample, ctx.currentTime)`).
3. **Slave clocks** (Stanza media, score transport, rhythm loop) project beat times onto the Web Audio timeline.
4. **Mix** — bind app sliders to `useAudioMixBus`; do not duplicate gain math.
5. Register app patterns in `audioPatternRegistry.ts`; guardrails in `audioPatternRegistry.test.ts`.

## Quick imports

```ts
import {
  MediaTimelineClock,
  scheduleDrumPatternWindow,
  useAudioMixBus,
  MetronomeSplitControl,
  useMetronomePreferences,
} from '../../shared/audio/platform';
```
