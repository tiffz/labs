# ADR 0021: Shared audio platform (clocks, scheduling, mix bus)

## Status

Accepted (July 2026)

## Context

Labs music apps implemented **four parallel timing stacks** (PreciseScheduler, score look-ahead, transport interval, reactive rAF). Stanza metronome and Words backing beat fired samples on React beat crossings — audible drift and duplicate implementations.

Drum accompaniment, metronome clicks, and volume mix were reimplemented per app with inconsistent gain math and scheduling.

## Decision

Introduce **`src/shared/audio/platform/`** as the canonical layer:

1. **Clocks** — `AudioClockSource` taxonomy: master, loop transport, score, media timeline.
2. **Scheduling** — `LookAheadAudioScheduler` + `scheduleDrumPatternWindow` for all grid-aligned emission.
3. **Mix** — `LabsAudioMixBus` / `useAudioMixBus` wrapping `playbackVolumeMix`.
4. **Players** — `createDrumAudioPlayer` factory.
5. **Registry** — `audioPatternRegistry.ts` + guardrail tests per app.

**Anti-patterns (no new uses):** reactive beat → immediate `playClickSampleAt`; per-note `setTimeout` from `performance.now`; duplicating mix gain formulas in apps.

**Stanza:** delete reactive `useStanzaMetronomeSync` implementation; replace with `MediaTimelineClock` + look-ahead (`usePlatformMediaMetronome`).

**Words backing beat:** migrate to `useLookAheadBackingBeat` on `rhythmPlayer` loop transport.

## Consequences

- New audio features must register in `audioPatternRegistry.ts` and follow [`docs/SHARED_AUDIO_PLATFORM.md`](../SHARED_AUDIO_PLATFORM.md).
- `DrumAccompaniment` requires a `scheduler` prop for audible drums (no reactive fallback).
- Documented exceptions: Agility oscillators, Encore chart interval (PROCESS_BACKLOG), Midi loop notes (PROCESS_BACKLOG).

## References

- [`docs/SHARED_AUDIO_PLATFORM.md`](../SHARED_AUDIO_PLATFORM.md)
- ADR [0008](0008-stanza-section-marker-model-and-metronome-calibration.md) — Stanza calibration data unchanged
- [`src/shared/audio/platform/README.md`](../src/shared/audio/platform/README.md)
