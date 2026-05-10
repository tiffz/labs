# Stanza

Practice tool: segment YouTube or local audio with markers, loop sections, passive focus time (heatmap), freeform recording, guided **Conductor** flow (listen → record → review), and optional **Metronome wizard** (tap tempo + alignment nudges).

- Entry: `/stanza/`
- **Deep link (YouTube):** append `?v=` plus the 11-character video id, e.g. `/stanza/?v=dQw4w9WgXcQ`. Opening that URL selects or creates the song and keeps the id in the address bar on refresh. Local audio files are not represented in the URL (`v` is cleared).
- Storage: Dexie (`stanza-practice` database); audio takes stay in IndexedDB on this device.
- **Local stems:** optional extra `<audio>` layers on top of the main local file; when any stem exists, the mix bus uses **Web Audio** (`MediaElementSource` → per-track `GainNode` → destination). See [`docs/adr/0004-stanza-stem-web-audio-mixer.md`](../../docs/adr/0004-stanza-stem-web-audio-mixer.md).

## Development

Same as other Labs apps: `npm run dev` then open `http://127.0.0.1:5173/stanza/`.
