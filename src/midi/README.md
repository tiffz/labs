# Midi Scratchpad

Always-listening piano loop capture for doodling short ideas at `/midi/`.

## Features

- **Scratchpad:** Rolling MIDI buffer, metronome, capture last N bars, dual-layer notation (strictness slider), loop playback, drag-to-export `.mid`
- **Compose:** Step-input riff builder (rhythm-agnostic)
- **Guide:** Metronome-driven prompts to learn your composed riff

## Engineering

- **MIDI in:** [`src/shared/midi/midiInput.ts`](../shared/midi/midiInput.ts)
- **Metronome:** [`src/shared/audio/metronome/`](../shared/audio/metronome/) (shared with Count Me In)
- **Notation:** [`ScoreDisplay`](../shared/notation/ScoreDisplay.tsx) via `displayLayerToPianoScore`
- **Export:** [`buildSingleTrackMidi`](../shared/music/midiBuilder.ts) + `SharedExportPopover`
- **Theme:** Vibrant Academic dark tokens in `midi.css`; MUI via `getAppTheme('midi')`

## Base path

`/midi/`

## Copy

See [`COPY_STYLE.md`](COPY_STYLE.md).
