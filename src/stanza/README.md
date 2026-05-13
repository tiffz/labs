# Stanza

Practice tool: segment YouTube or local audio with markers, loop sections, passive focus time (heatmap), optional stem mix layers, semitone pitch shift on the main upload (when no stems), and metronome calibration (BPM / beat 1 plus automatic **Analyze** for local media).

- Entry: `/stanza/`
- **Deep link (YouTube):** append `?v=` plus the 11-character video id, e.g. `/stanza/?v=dQw4w9WgXcQ`. Opening that URL selects or creates the song and keeps the id in the address bar on refresh. Local audio files are not represented in the URL (`v` is cleared).
- Storage: Dexie (`stanza-practice` database). Legacy practice **takes** rows may still exist from older builds.
- **Local stems:** optional extra `<audio>` layers on top of the main local file; when any stem exists, the mix bus uses **Web Audio** (`MediaElementSource` → per-track `GainNode` → destination). See [`docs/adr/0004-stanza-stem-web-audio-mixer.md`](../../docs/adr/0004-stanza-stem-web-audio-mixer.md).

## Development

Same as other Labs apps: `npm run dev` then open `http://127.0.0.1:5173/stanza/`.
