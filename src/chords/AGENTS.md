# Chords — agent context

Nested **`AGENTS.md`** for Chords. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — progression editing, playback, URL state.
2. **Theory/voicing:** import from [`src/shared/music/`](../shared/music/) directly (`chordTheory`, `chordVoicing`), not deleted app adapters.
3. **Shared UI:** [`/ui/`](/ui/) — `PlaybackSoundSelect`, `BpmInput`, `ChordStyleInput`, `ChordProgressionInput`.
4. **Notation highlights:** [`src/shared/notation/playbackSvgHighlight.ts`](../shared/notation/playbackSvgHighlight.ts) (`syncKeyedSvgHighlights`).
5. **Copy:** [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).

## Pitfalls

- **`ChordPlaybackSettingsPanel`** is for chart-style playback (Encore Originals). Main app uses **`PlaybackVolumeRow`** for master/piano/metronome levels — do not hand-roll slider rows.
- **`ChordScoreRenderer`** separates content redraw from highlight toggle; do not pass `activeNoteGroups` into main render effect deps.
- Use `vexFlowDurationToBeats` from shared notation for duration validation.

## Tests

- Unit: `npm test -- src/chords`
- Renderer: `src/chords/components/ChordScoreRenderer.test.tsx`
