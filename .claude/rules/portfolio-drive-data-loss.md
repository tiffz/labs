---
paths:
  - 'src/**/drive/**'
  - 'src/**/hooks/use*DriveBackup.ts'
  - 'src/shared/drive/**'
  - 'src/encore/drive/**'
  - 'src/encore/context/EncoreSyncContext.tsx'
---

<!-- AUTO-GENERATED from .cursor/rules/portfolio-drive-data-loss.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> P0 data-loss guards when editing Drive sync, merge, delete, or backup hooks

# Drive sync — data-loss guards (P0)

**Read first:** [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../../docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md) · skill **`labs-drive-backup`**

## Before changing merge, envelope, or delete UX

1. **Tombstones** — delete/remove-from-group → envelope field + merge filter + test (`local delete → remote still lists → stays deleted`).
2. **Undo snapshot** before pull/merge (`snapshotBeforeMerge` / factory).
3. **Never bypass** `labsDriveAutoPushAllowed` on a fresh device.
4. **Sidecars before envelope** — upload blobs, then write `progress.json` / repertoire JSON.
5. **Bulk import** — `notify*LocalChange({ immediate: true })`.
6. **Push lifecycle** — debounced push must flush on `visibilitychange→hidden` and `pagehide`; 412 → pull → rewrite.
7. **Conflict copy** — show what each side holds; no blind LWW on rich rows (ADR 0019).

## Red flags (stop and fix)

- Union merge without tombstone filter on deleted ids
- New synced field without merge test
- Auto-push without prior pull on empty device
- Removing undo snapshots or recovery UI without replacement
- Gesture-style custom hook drift from `createLabsPortfolioDriveBackup` (412, flush)

## Tests required

Touch merge module → run app `*DriveMerge.test.ts`. Touch shared auto-sync → `useLabsDrivePortfolioAutoSync.test.ts`. Encore merge → `encoreRepertoireMerge.test.ts` + `encoreDataRecovery.test.ts`.
