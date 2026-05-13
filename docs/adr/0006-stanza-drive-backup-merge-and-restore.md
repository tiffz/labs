# ADR 0006: Stanza Drive backup — conflict prompt, per-song merge, local undo snapshots

## Status

Accepted

## Context

Stanza writes a single Google Drive JSON file (`progress.json` under the Labs Stanza folder) containing **library metadata only** (markers, YouTube ids, mix fields, stem labels — not audio bytes). The file is effectively **last-writer-wins**. Users who back up from more than one browser or environment with the same Google account can overwrite a richer cloud copy with a sparse one, which looks like “markers disappeared.”

Users asked for: visible **sync conflict** warnings, **actionable context**, **automatic reconciliation** where safe, and a way to **undo** a bad choice.

## Decision

1. **Before each backup**, push the current local envelope into a short **undo stack** in `localStorage` (`labs_stanza_drive_undo_snapshots_v1`, capped at five entries), then read the remote JSON and assess whether the cloud file looks **newer or divergent** than this device last recorded (`stanzaDriveSyncMeta` + Drive `modifiedTime` + envelope `exportedAt`). If so, **block the upload** and show a dialog instead of silently overwriting.

2. **Merge** (`mergeDriveRowsIntoLocalLibrary`): union of song ids from local Dexie and remote rows. For each id, pick the **newer `updatedAt`** as the metadata winner. When remote wins, rebuild the row from Drive metadata but **retain local-only bytes**: `localAudioBlob`, `localVideoThumbnailBlob`, and per-stem `localBlob` when stem ids still match. **Remote-only** songs are added only when they are playable from metadata alone (**YouTube** id or **`driveSourceFileId`**); otherwise they are skipped with a summary line (no phantom library entries without audio).

3. **User actions**: **Merge** (apply merge locally, then upload), **Replace Drive** (upload local as-is, overwriting cloud — previous behavior), **Cancel**. **Restore** opens a picker of undo snapshots; applying one merges that snapshot’s song list into the current library with the same merge helper (so local blobs are preserved where ids align).

## Consequences

- Drive remains a **backup channel**, not real-time sync; conflict detection is **heuristic** (timestamps + first-seen-device) and may false-negative if clocks skew or metadata is edited without bumping `updatedAt`.
- Undo snapshots are **local to the browser**; clearing site data removes them. They are not a substitute for exporting or versioned cloud history.
- **Encore ↔ Stanza shared stem / practice-resource storage** is specified in **[ADR 0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md)** (Encore-owned `Encore_App/` tree and repertoire schema; Stanza overlay / secondary client). This ADR remains about Stanza’s legacy `Tiff Zhang Labs/Stanza/progress.json` backup UX until migration lands.

## Links

- [`src/stanza/drive/stanzaDriveMerge.ts`](../../src/stanza/drive/stanzaDriveMerge.ts)
- [`src/stanza/drive/stanzaDriveConflict.ts`](../../src/stanza/drive/stanzaDriveConflict.ts)
- [`src/stanza/drive/stanzaDriveUndoSnapshots.ts`](../../src/stanza/drive/stanzaDriveUndoSnapshots.ts)
- [`src/stanza/hooks/useStanzaDriveBackup.ts`](../../src/stanza/hooks/useStanzaDriveBackup.ts)
