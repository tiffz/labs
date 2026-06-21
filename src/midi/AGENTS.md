# Midi — agent context

Nested **`AGENTS.md`** for Midi Scratchpad. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md)
2. **Shared MIDI:** [`src/shared/midi/midiInput.ts`](../shared/midi/midiInput.ts)
3. **Metronome:** [`src/shared/audio/metronome/`](../shared/audio/metronome/)
4. **Copy:** [`COPY_STYLE.md`](COPY_STYLE.md)

## Pitfalls

- Raw performance lives in `CapturedLoop.events`; never write quantized data back to raw.
- `ScoreDisplay` requires `currentMeasureIndex` + `currentNoteIndices` even when idle.
- Do not import from `src/count/` — use shared metronome only.

## Tests

- `npm test -- src/midi`
