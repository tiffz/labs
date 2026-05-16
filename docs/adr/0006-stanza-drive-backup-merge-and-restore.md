# ADR 0006: Stanza Drive backup — auto-sync, conflict prompt, per-song merge, local undo snapshots

## Status

Accepted (revised — auto-pull / auto-push, Drive-snapshot restore)

## Context

Stanza writes a single Google Drive JSON file (`progress.json` under the Labs Stanza folder) containing **library metadata only** (markers, BPM calibration, mix levels, drums on/off, skip flags, stem labels — but **not** audio bytes, video thumbnails, or stem blobs). The file is effectively **last-writer-wins**. Users who back up from more than one browser or environment with the same Google account can overwrite a richer cloud copy with a sparse one, which looks like “markers disappeared.”

The original implementation made backup fully **manual**: the user had to click “Back up with Google” on every device after every editing session. In practice, that meant most edits never made it to Drive, so logging into a new device showed the videos themselves (because YouTube ids round-trip via Encore’s Drive metadata) but **no sections, BPM, mix, or skip data** — which is exactly the “syncing doesn’t save anything besides the videos” feedback that drove this revision.

Users asked for: changes to **propagate automatically** between devices, visible **sync conflict** warnings when the heuristic detects divergence, **actionable context** in the conflict UI, and a way to **undo** a bad merge.

## Decision

1. **Auto-pull on app open** (`useStanzaDriveBackup` effect): the first time per session that we have a tester-allowlisted Google identity, the hook reads the Drive `progress.json` and runs `mergeDriveRowsIntoLocalLibrary` against the local Dexie table. The merge is non-destructive: per-song newer `updatedAt` wins, local-only songs are preserved, and remote-only metadata is materialized only when playable (YouTube id or `driveSourceFileId`). The pull is silent — no toast on success — but failures surface in the account-menu message slot.

2. **Auto-push debounced** (`STANZA_DRIVE_AUTO_PUSH_DEBOUNCE_MS = 6_000`, `MIN_INTERVAL_MS = 4_000`): after the initial pull resolves, the hook subscribes to Dexie `creating` / `updating` / `deleting` events on the `songs` table. Any user edit (which already bumps `updatedAt`) re-arms a single debounced timer that writes the latest envelope back to Drive. A module-level `stanzaDriveMergeInProgress` flag suppresses hook firings during merge writes so a pull doesn’t immediately push the same data back. If the push fails the message is shown but **no retry loop runs**; the next user edit retries naturally and the manual “Back up” button still works.

3. **Manual “Back up with Google”** keeps its existing role: it pushes a local `pushStanzaDriveUndoSnapshot` into a 5-deep `localStorage` ring buffer (`labs_stanza_drive_undo_snapshots_v1`) **before** writing, then runs the same conflict assessment as before. When the cloud appears newer than the device last recorded (or when this is the first push from a device that has never seen the file), the conflict dialog shows up and offers Merge / Replace / Cancel.

4. **Restore library** (`StanzaAccountMenu` dialog): always lists **“Latest backup from Drive”** at the top — clicking it re-runs `pullFromDriveAndMerge`, even on devices with no local snapshots — followed by the local `localStorage` snapshot list (still browser-local). The Restore button itself is enabled whenever a Drive backup exists for the account, so a fresh device on first visit can immediately pull its prior data.

5. **Account menu surfaces**: a debug-friendly **“Open Stanza folder in Drive”** link (constructed from the cached `driveAppFolderId` in `stanzaDriveSyncMeta`) opens the live Drive folder in a new tab so users can inspect `progress.json`, the undo snapshots they expect to see, or sharing settings without leaving Stanza.

## Consequences

- Drive sync now **feels like real sync** — open a second device, the account menu auto-pulls, and edits flow back via the debounced auto-push. Conflicts (two devices editing the same song between pushes) still resolve to **per-song newer-wins** at the next merge, which we accept as the right trade-off for a metadata-only backup; it is documented in the conflict dialog.
- The auto-push fires from the same Dexie event stream that powers `useLiveQuery`, so a misbehaving caller that bumps `updatedAt` for spurious reasons can chatter Drive. The debounce + `MIN_INTERVAL_MS` cap absorb typical multi-control edits but a bug like “write song every animation frame” would still be visible as repeated Drive writes; we accept this risk because it would also be a serious local-storage bug.
- The Drive envelope explicitly drops `localAudioBlob`, `localVideoThumbnailBlob`, and per-stem `localBlob` (see `stanzaDriveEnvelope.ts`). Thumbnails are auto-rederived locally; audio and stems are deliberately device-local to keep `progress.json` small and avoid leaking gigabyte uploads through the metadata channel.
- Undo snapshots are still **local to the browser**; clearing site data removes them. The new “Latest from Drive” entry partially compensates by giving users a one-tap way to roll back to whatever `progress.json` currently says.
- **Encore ↔ Stanza shared stem / practice-resource storage** is specified in **[ADR 0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md)** (Encore-owned `Encore_App/` tree and repertoire schema; Stanza overlay / secondary client). This ADR remains about Stanza’s legacy `Tiff Zhang Labs/Stanza/progress.json` backup UX until migration lands.

## Links

- [`src/stanza/drive/stanzaDriveEnvelope.ts`](../../src/stanza/drive/stanzaDriveEnvelope.ts)
- [`src/stanza/drive/stanzaDriveMerge.ts`](../../src/stanza/drive/stanzaDriveMerge.ts)
- [`src/stanza/drive/stanzaDriveConflict.ts`](../../src/stanza/drive/stanzaDriveConflict.ts)
- [`src/stanza/drive/stanzaDriveSyncMeta.ts`](../../src/stanza/drive/stanzaDriveSyncMeta.ts)
- [`src/stanza/drive/stanzaDriveUndoSnapshots.ts`](../../src/stanza/drive/stanzaDriveUndoSnapshots.ts)
- [`src/stanza/hooks/useStanzaDriveBackup.ts`](../../src/stanza/hooks/useStanzaDriveBackup.ts)
- [`src/stanza/components/StanzaAccountMenu.tsx`](../../src/stanza/components/StanzaAccountMenu.tsx)
