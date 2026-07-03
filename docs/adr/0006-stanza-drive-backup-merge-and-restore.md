# ADR 0006: Stanza Drive backup — auto-sync, conflict prompt, per-song merge, local undo snapshots

## Status

Accepted (revised — auto-pull / auto-push, Drive-snapshot restore, Drive deletion tombstones).

**Conflict UX superseded by [ADR 0020](0020-silent-union-sync-row-conflicts-only.md):** Stanza no longer
shows a coarse Merge / Replace dialog on routine divergence. Auto-pull/push, tombstones, and undo
snapshots in this ADR remain in force.

## Context

Stanza writes a single Google Drive JSON file (`progress.json` under the Labs Stanza folder) containing **library metadata only** (markers, BPM calibration, mix levels, drums on/off, skip flags, stem labels — but **not** audio bytes, video thumbnails, or stem blobs). The file is effectively **last-writer-wins**. Users who back up from more than one browser or environment with the same Google account can overwrite a richer cloud copy with a sparse one, which looks like “markers disappeared.”

The original implementation made backup fully **manual**: the user had to click “Back up with Google” on every device after every editing session. In practice, that meant most edits never made it to Drive, so logging into a new device showed the videos themselves (because YouTube ids round-trip via Encore’s Drive metadata) but **no sections, BPM, mix, or skip data** — which is exactly the “syncing doesn’t save anything besides the videos” feedback that drove this revision.

Users asked for: changes to **propagate automatically** between devices, visible **sync conflict** warnings when the heuristic detects divergence, **actionable context** in the conflict UI, and a way to **undo** a bad merge.

## Decision

1. **Auto-pull on app open** (`useStanzaDriveBackup` effect): the first time per session that we have a tester-allowlisted Google identity, the hook reads the Drive `progress.json` and runs `mergeDriveRowsIntoLocalLibrary` against the local Dexie table. The merge is non-destructive: per-song newer `updatedAt` wins, local-only songs are preserved, and remote-only metadata is materialized only when playable (YouTube id or `driveSourceFileId`). The pull is silent — no toast on success — but failures surface in the account-menu message slot.

2. **Auto-push debounced** (`STANZA_DRIVE_AUTO_PUSH_DEBOUNCE_MS = 6_000`, `MIN_INTERVAL_MS = 4_000`): after the initial pull resolves, the hook subscribes to Dexie `creating` / `updating` / `deleting` events on the `songs` table. Any user edit (which already bumps `updatedAt`) re-arms a single debounced timer that writes the latest envelope back to Drive. A module-level `stanzaDriveMergeInProgress` flag suppresses hook firings during merge writes so a pull doesn’t immediately push the same data back. If the push fails the message is shown but **no retry loop runs**; the next user edit retries naturally and the manual “Back up” button still works.

3. **Manual “Back up with Google”** keeps its existing role: it pushes a local undo snapshot into a **20-deep IndexedDB** ring buffer (`stanzaDb.undoSnapshots`, migrating legacy `localStorage` entries) **before** writing, then runs the same conflict assessment as before. **Auto-pull**, **conflict merge**, and **snapshot restore** also capture a pre-merge snapshot so a bad sync can be rolled back from Restore. When the cloud appears newer than the device last recorded (or when this is the first push from a device that has never seen the file), the conflict dialog shows up and offers Merge / Replace / Cancel.

4. **Restore library** (`StanzaAccountMenu` dialog): always lists **“Latest backup from Drive”** at the top — clicking it re-runs `pullFromDriveAndMerge`, even on devices with no local snapshots — followed by the local `localStorage` snapshot list (still browser-local). The Restore button itself is enabled whenever a Drive backup exists for the account, so a fresh device on first visit can immediately pull its prior data.

5. **Account menu surfaces**: a debug-friendly **“Open Stanza folder in Drive”** link (constructed from the cached `driveAppFolderId` in `stanzaDriveSyncMeta`) opens the live Drive folder in a new tab so users can inspect `progress.json`, the undo snapshots they expect to see, or sharing settings without leaving Stanza.

6. **Deletion tombstones for Drive-backed rows** ([`stanzaDriveTombstones.ts`](../../src/stanza/drive/stanzaDriveTombstones.ts)). The per-`id` union merge in (1) has no way to express _removal_ — a row that exists on either side is kept on the merged side. Without a tombstone, deleting a `?df=…` library row would silently re-appear because either (a) the device reloaded inside the 6-second auto-push debounce window so the deletion never reached Drive, or (b) another device still had the row locally and pushed it back. Stanza now persists a per-`driveSourceFileId` tombstone whenever a Drive-backed row is removed:
   - **Persisted locally** under `stanza_drive_file_tombstones_v1` (capped at 500 most-recent entries) so the deletion survives reloads on the same device.
   - **Pushed to Drive** as the optional `deletedDriveSourceFileIds` array on the V1 envelope (back-compat: older Stanza builds ignore the field). `buildStanzaDriveEnvelope` populates it from the local store on every push.
   - **Unioned on pull** in `mergeRemoteEnvelopeIntoLocal` so a deletion that originated on another device also stops re-adding the row on this one.
   - **Enforced in the merge** via the optional `tombstoneFileIds` argument to `mergeDriveRowsIntoLocalLibrary` — remote-only rows whose `driveSourceFileId` is tombstoned are skipped (counted under `report.skippedTombstoned`). Local rows that still claim a tombstoned `driveSourceFileId` are reported as _stale_; the hook clears them so a reversed deletion isn't re-broadcast.
   - **Cleared on re-intent**: a successful re-import via the `?df=` deep-link prompt, a snapshot restore that brings the row back, an undo of the delete, or the stale-tombstone path above all drop the tombstone.

   The address bar is also cleaned up on delete: when `removeSongById` runs and the current URL's `?df=` matches the deleted row, `replaceStanzaPlaybackUrlSearchParams` strips the deep-link params so a refresh doesn't fall through into the bootstrap path. The bootstrap effect itself consults the tombstone store before importing and, on a match, renders a short **"You removed _<title>_ from your library. Re-add?"** prompt (Re-add clears the tombstone and runs the standard import; Not now strips the URL and dismisses).

## Consequences

- Drive sync now **feels like real sync** — open a second device, the account menu auto-pulls, and edits flow back via the debounced auto-push. Per-song merge still uses `updatedAt` for title/mix freshness, but **section markers, stats, metronome maps, and skip flags use marker-safe heuristics** (`mergeStanzaRicherSongMetadata`): non-empty beats empty, more markers beats fewer, and a device that never sectioned a song cannot clobber a richly marked copy when remote `updatedAt` is newer.
- The auto-push fires from the same Dexie event stream that powers `useLiveQuery`, so a misbehaving caller that bumps `updatedAt` for spurious reasons can chatter Drive. The debounce + `MIN_INTERVAL_MS` cap absorb typical multi-control edits but a bug like “write song every animation frame” would still be visible as repeated Drive writes; we accept this risk because it would also be a serious local-storage bug. Internal migrations (segment id remap) and thumbnail backfill do **not** bump `updatedAt`.
- The Drive envelope explicitly drops `localAudioBlob`, `localVideoThumbnailBlob`, and per-stem `localBlob` (see `stanzaDriveEnvelope.ts`). Thumbnails are auto-rederived locally; audio and stems are deliberately device-local to keep `progress.json` small and avoid leaking gigabyte uploads through the metadata channel.
- Undo snapshots are still **local to the browser** (IndexedDB); clearing site data removes them. Restore lists song + section counts per snapshot; **Undo last sync** rolls back to the most recent pre-pull snapshot when available.
- **Encore ↔ Stanza shared stem / practice-resource storage** is specified in **[ADR 0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md)** (Encore-owned `Encore_App/` tree and repertoire schema; Stanza overlay / secondary client). This ADR remains about Stanza’s legacy `Tiff Zhang Labs/Stanza/progress.json` backup UX until migration lands.
- **Drive deletion tombstones are append-mostly + capped** at 500 entries. A user who churns through hundreds of one-off Drive imports may eventually evict an older tombstone; if a Drive `progress.json` from a stale device still references that file id, the row could come back. We accept this because (a) the cap keeps `progress.json` size predictable and (b) at that retention depth the user can re-delete with one click and the new tombstone goes to the top of the list.

## Links

- [`src/stanza/drive/stanzaDriveEnvelope.ts`](../../src/stanza/drive/stanzaDriveEnvelope.ts)
- [`src/stanza/utils/stanzaSongMetadataMerge.ts`](../../src/stanza/utils/stanzaSongMetadataMerge.ts)
- [`src/stanza/utils/stanzaMarkerMerge.ts`](../../src/stanza/utils/stanzaMarkerMerge.ts)
- [`src/stanza/utils/stanzaSongCustomizationScore.ts`](../../src/stanza/utils/stanzaSongCustomizationScore.ts)
- [`src/stanza/drive/stanzaDriveConflict.ts`](../../src/stanza/drive/stanzaDriveConflict.ts)
- [`src/stanza/drive/stanzaDriveSyncMeta.ts`](../../src/stanza/drive/stanzaDriveSyncMeta.ts)
- [`src/stanza/drive/stanzaDriveTombstones.ts`](../../src/stanza/drive/stanzaDriveTombstones.ts)
- [`src/stanza/drive/stanzaDriveUndoSnapshots.ts`](../../src/stanza/drive/stanzaDriveUndoSnapshots.ts)
- [`src/stanza/hooks/useStanzaDriveBackup.ts`](../../src/stanza/hooks/useStanzaDriveBackup.ts)
- [`src/stanza/components/StanzaAccountMenu.tsx`](../../src/stanza/components/StanzaAccountMenu.tsx)
- [`src/stanza/components/StanzaWorkspace.tsx`](../../src/stanza/components/StanzaWorkspace.tsx) — `removeSongById` tombstone write + URL strip; bootstrap effect's Re-add prompt.
