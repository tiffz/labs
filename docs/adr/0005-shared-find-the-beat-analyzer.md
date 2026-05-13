# ADR 0005: Shared Find-the-Beat analyzer (Essentia pipeline)

## Status

Accepted

## Context

Find the Beat (`src/beat/`) implements tempo and beat-grid analysis using Essentia.js (RhythmExtractor2013, ensemble tempo, gap resync, and related helpers). Stanza needs the **same** analysis for optional **per-section** metronome calibration on **locally uploaded** audio.

Import-boundary rules forbid `src/stanza/**` from importing `src/beat/**`. A second, lighter `analyzeBeat` already existed under `src/shared/audio/beatAnalyzer.ts` for Piano; it is not interchangeable with the full Find-the-Beat pipeline.

## Decision

1. Move the **full** Find-the-Beat analyzer implementation and its direct tempo/onset dependencies into `src/shared/beat/**` (alongside existing `src/shared/beat/analysis/onsets.ts`).
2. Expose a single **Essentia WASM singleton** in `src/shared/beat/essentiaSingleton.ts`. Consumers that only need Essentia (Piano chroma, experimental beat detectors) import `getEssentia` from there instead of duplicating WASM bootstrapping.
3. Keep `src/beat/utils/*.ts` as **thin re-exports** where needed so existing beat imports keep working without cross-app coupling.
4. Stanza calls a small **segment helper** (`slice` decoded audio to the section window, run `analyzeBeat` on the slice, map `offset` back to absolute media time). **Automatic analysis is only offered for directly uploaded media** that can be decoded to an `AudioBuffer` (not YouTube).

## Consequences

- Essentia is initialized once per page load when any feature touches `getEssentia` (Find the Beat, Stanza segment analysis, Piano, experimental detectors).
- Changes to tempo detection affect both Find the Beat and Stanza; regression tests under `src/beat/**` remain the primary harness.
- `src/shared/beat/**` must not import app code (`stanza`, `beat`, etc.); only `src/shared/**` and packages.

## Links

- [`src/shared/beat/findTheBeatAnalyzer.ts`](../../src/shared/beat/findTheBeatAnalyzer.ts)
- [`src/shared/beat/essentiaSingleton.ts`](../../src/shared/beat/essentiaSingleton.ts)
- [`src/stanza/db/stanzaDb.ts`](../../src/stanza/db/stanzaDb.ts) (per-section metronome storage)
