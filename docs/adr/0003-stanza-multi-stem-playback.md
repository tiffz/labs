# ADR 0003: Stanza optional multi-stem playback (local)

## Status

Accepted (playback mix bus refined by [0004](./0004-stanza-stem-web-audio-mixer.md) for local songs with stems)

## Context

Stanza’s primary media is a single YouTube embed or one local `Blob` (`localAudioBlob`). Musicians sometimes have **aligned alternate mixes** (for example instrumental-only) and want to **mute or rebalance** layers without leaving the practice surface.

IndexedDB already stores large blobs per song. Google Drive backup (`stanzaDriveEnvelope`) intentionally omits audio bytes; stem blobs must follow the same rule.

## Decision

1. **Data model** — Optional `stems?: StanzaStemTrack[]` on `StanzaSong`, where each stem has `id`, `label`, `localBlob`, and optional `muted` / `gain` (0–1). Dexie schema version bumps for migration bookkeeping; stems live inline on the song row (same table).
2. **Scope** — Stems apply to **local and Drive-imported** rows (`ytId == null`). **YouTube** remains single-track; the stems panel is hidden for YouTube selections.
3. **Playback** — Additional hidden `<audio>` elements per stem, **clock-locked** to the primary `<audio>` / `<video>` via the existing unified transport (`seekUnified`, `playUnified`, `pauseUnified`, `applyPlaybackRate`). No Web Audio graph in v1; gain uses `HTMLMediaElement.volume`, mute uses `muted`.
4. **Backup** — `buildStanzaDriveEnvelope` strips `localBlob` from each stem and exports metadata only (`label`, `muted`, `gain`, `id`), matching “metadata to Drive, audio on device.”
5. **Metronome / Conductor / recording** — Clicks and guided flow continue to use **primary media time** from the master element. Stems are a **parallel audition bus** only; they are not fed into the metronome scheduler or recording pipeline in v1.

## Consequences

- Users can practice with aligned reference tracks without a separate DAW.
- Restore-from-Drive cannot recreate stem audio; re-import stems on a new device if needed.
- Drift between multiple `<audio>` elements is possible on long sessions; if it becomes visible, a follow-up may move mixing to Web Audio with one clock.

## Alternatives considered

- **Web Audio `decodeAudioData` + GainNode** — Better sync and metering; higher implementation cost and buffer memory. Deferred until drift or advanced metering is required.
- **YouTube multi-audio** — Not supported by the product model (no second stream API in Stanza).

## Links

- Implementation: [`src/stanza/db/stanzaDb.ts`](../../src/stanza/db/stanzaDb.ts), [`src/stanza/components/StanzaWorkspace.tsx`](../../src/stanza/components/StanzaWorkspace.tsx), [`src/stanza/drive/stanzaDriveEnvelope.ts`](../../src/stanza/drive/stanzaDriveEnvelope.ts)
