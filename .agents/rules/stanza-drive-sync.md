---
description: Stanza Google Drive backup — blob tiers, merge/hydrate paths, push ordering
globs:
  - src/stanza/drive/**
  - src/stanza/hooks/useStanzaDriveBackup.ts
  - src/stanza/drive/stanzaDriveEnvelope.ts
---

# Stanza Drive sync

## Blob tiers (all need upload + hydrate)

| Tier           | Drive folder    | Link field            | Module                        |
| -------------- | --------------- | --------------------- | ----------------------------- |
| Mix layers     | `stem_audio/`   | `stems[].driveFileId` | `stanzaDriveStemSync.ts`      |
| Main recording | `main_audio/`   | `driveSourceFileId`   | `stanzaDriveMainMediaSync.ts` |
| Metadata       | `progress.json` | song rows (no blobs)  | `stanzaDriveEnvelope.ts`      |

**Never** ship metadata-only local uploads without a bytes tier. Rows with markers but no `localAudioBlob` and no `driveSourceFileId` are broken on other devices.

## Push / pull invariants

- `flushDriveWrite`: upload main media + stems **before** serializing `progress.json`.
- After every merge (auto-pull, conflict merge, undo restore): `hydrateStanzaLibraryMainMediaFromDrive` + `hydrateStanzaLibraryStemsFromDrive`.
- `confirmMergeThenUpload`: call `markPullSucceeded()` and patch sync meta before push.
- Unplayable local rows should adopt remote `driveSourceFileId` (`resolveDriveSourceFileIdForMerge`).

## Tests

- `stanzaDriveMainMediaSync.test.ts`, `stanzaDriveStemSync.test.ts`, `stanzaDriveMerge.test.ts`
- App checklist: [`src/stanza/AGENTS.md`](../../src/stanza/AGENTS.md) § Drive sync checklist
