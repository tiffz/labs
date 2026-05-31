# Stanza

Practice tool. Open a YouTube video or upload local audio, split it into sections,
loop, log focus time, layer in extra audio (alternate mixes / instrumentals), shift
pitch on uploads, calibrate a per-section metronome (manual or **Analyze**), and
play a drum groove that follows the metronome BPM.

**Agents:** start with [`AGENTS.md`](AGENTS.md) and [`LAYOUT.md`](LAYOUT.md).

- Entry: `/stanza/`
- **Deep link (YouTube):** append `?v=` plus the 11-character video id, e.g.
  `/stanza/?v=dQw4w9WgXcQ`. Opening that URL selects or creates the song and keeps
  the id in the address bar on refresh. Local audio files are not represented in
  the URL (`v` is cleared).
- Storage: Dexie (`stanza-practice` database). Legacy practice **takes** rows may
  still exist from older builds.
- **Undo:** Section splits, boundary drags, joins, renames, mix settings, and other
  song edits go through `persistSong` with the shared Labs undo stack (header buttons
  plus ⌘Z / Ctrl+Z). Boundary drags record undo from where the drag started. The stack
  resets when you open a different song.
- **Splits:** New boundaries must be at least **0.5s** from an existing split (prevents
  stacked handles). **Split at playhead** and **M** are blocked with a short notice when
  too close.
- **Drive restore:** `progress.json` syncs section markers, BPM, mix, and skip flags.
  **Mix layers (stems)** upload to `stem_audio/` on backup and re-download after restore.
  The **main recording** is not in that JSON; Drive-linked songs (`?df=` / Encore uploads)
  re-download when you open them on a new device (same Google account).

## Architecture

Viewer layout contract: [`LAYOUT.md`](./LAYOUT.md). Practice rail notes: [`PRACTICE_RAIL.md`](./PRACTICE_RAIL.md).

Behavior that's wider than a single file is captured in ADRs:

- [ADR 0003](../../docs/adr/0003-stanza-multi-stem-playback.md) — optional multi-layer
  playback (local files + Drive metadata).
- [ADR 0004](../../docs/adr/0004-stanza-stem-web-audio-mixer.md) — when any mix layer
  exists, the mix bus uses **Web Audio** (`MediaElementSource` → per-track
  `GainNode` → destination); otherwise the main element plays directly.
- [ADR 0005](../../docs/adr/0005-shared-find-the-beat-analyzer.md) — the shared
  Essentia-based "Find the beat" analyzer used by the metronome **Auto** path.
- [ADR 0006](../../docs/adr/0006-stanza-drive-backup-merge-and-restore.md) — Drive
  backup conflict prompt, merge, and local undo snapshots.
- [ADR 0007](../../docs/adr/0007-encore-owned-practice-resources-stanza-secondary-client.md)
  — Encore-owned practice resources on Drive; Stanza as secondary client.
- [ADR 0008](../../docs/adr/0008-stanza-section-marker-model-and-metronome-calibration.md)
  — Section/marker data model and per-section metronome calibration.
- [ADR 0009](../../docs/adr/0009-stanza-drums-and-metronome-volume.md) — Drums
  groove (shared `DrumAccompaniment`), metronome/drums Mix volume + mute.

## Copy style

User-facing strings (timeline, dialogs, alerts, tooltips, aria-labels) follow
[`COPY_STYLE.md`](./COPY_STYLE.md), which extends
[`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) with the canonical
terminology for sections, mix layers, snap-to-beat, and Beat 1 calibration.

## Development

Same as other Labs apps: `npm run dev` then open `http://127.0.0.1:5173/stanza/`.

For the right-hand **Practice** rail (metronome, tap tempo, drums, mix), see
[`PRACTICE_RAIL.md`](./PRACTICE_RAIL.md) — layout pitfalls, audio gates, and a pre-ship checklist.
