# Chords App

Chord progression generator/player with notation rendering, style presets, and URL-shareable state.

## Core Responsibilities

- progression editing (`I–V–vi–IV` or symbol-based forms),
- key/time/style controls,
- playback scheduling + highlighting,
- score rendering.

## Important Modules

```text
src/chords/
  App.tsx
  components/
    ManualControls.tsx
    ChordScoreRenderer.tsx
  hooks/useUrlState.ts
  utils/
    playback/
    chordStyling.ts
    keySignature.ts
    keyTransposition.ts
```

## Shared Boundary Notes

Canonical theory/typing now lives in `src/shared/music/**`.

- `src/chords/utils/chordTheory.ts` and `src/chords/utils/chordVoicing.ts`
  are compatibility adapters to shared implementations.
- New theory/voicing logic should be added in shared first, then consumed here.

## Playback Boundaries

- Shared primitives: lifecycle, transport/scheduler, instrument factory.
- Chords app owns progression semantics, highlight policy, and measure-boundary update behavior.

## Tests

Primary unit tests live with utilities (e.g. `src/chords/utils/*.test.ts`).

Renderer regressions are covered in component tests:

- `src/chords/components/ChordScoreRenderer.test.tsx` guards 12/8 `one-per-beat`
  engraving so stray flag glyphs do not reappear.

Run:

```sh
npm test -- src/chords
```
