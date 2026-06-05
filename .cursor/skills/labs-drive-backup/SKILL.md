---
name: labs-drive-backup
description: Implements Labs Google Drive backup, conflict prompts, and LabsDriveAccountMenu integration. Use when editing useStanzaDriveBackup, useScalesDriveBackup, drive conflict assessment, or Drive sync UX.
---

# Labs Drive backup

## Canonical doc

[`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — architecture, data-loss guards, conflict flows, ADR links.

## Shared UI

- Menu shell: [`LabsDriveAccountMenu`](../../src/shared/google/LabsDriveAccountMenu.tsx) — see `SHARED_UI_CONVENTIONS.md` § Drive
- UI prop types: [`labsDriveBackupUiTypes.ts`](../../src/shared/google/labsDriveBackupUiTypes.ts)
- Conflict assessor: [`labsDriveBackupTypes.ts`](../../src/shared/drive/labsDriveBackupTypes.ts) (app adapters in `*DriveConflict.ts`)

## Shared session hook

[`useLabsDrivePortfolioAutoSync.ts`](../../src/shared/drive/useLabsDrivePortfolioAutoSync.ts) — auto-pull once + debounced auto-push. Shared copy: [`labsDriveSyncMessages.ts`](../../src/shared/drive/labsDriveSyncMessages.ts).

## App hooks (inject merge + envelope)

| App    | Hook                                       |
| ------ | ------------------------------------------ |
| Stanza | `src/stanza/hooks/useStanzaDriveBackup.ts` |
| Scales | `src/scales/hooks/useScalesDriveBackup.ts` |

## Workflow

1. Read [`LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) + app hook + merge module before changing envelope shape
2. Keep **on-screen copy** honest; full OAuth scope in app README
3. ADRs: 0006, 0007 (+ [revision](../../docs/adr/0007-revision-stanza-encore-federated-sync.md)), 0010, 0011, 0012
4. **`npm run presubmit`**

## Ask first

- OAuth client or sync contract changes → skill `labs-write-adr`
- Stanza ↔ Encore overlay migration → product sign-off on ADR 0007 revision
