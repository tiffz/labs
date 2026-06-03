---
name: labs-drive-backup
description: Implements Labs Google Drive backup, conflict prompts, and LabsDriveAccountMenu integration. Use when editing useStanzaDriveBackup, useScalesDriveBackup, drive conflict assessment, or Drive sync UX.
---

# Labs Drive backup

## Shared UI

- Menu shell: [`LabsDriveAccountMenu`](../../src/shared/google/LabsDriveAccountMenu.tsx) — see `SHARED_UI_CONVENTIONS.md` § Drive
- Conflict reason enums: shared assessors in app `drive/*DriveConflict.ts`

## App hooks (parallel implementations — prefer shared skeleton)

| App    | Hook                                       |
| ------ | ------------------------------------------ |
| Stanza | `src/stanza/hooks/useStanzaDriveBackup.ts` |
| Scales | `src/scales/hooks/useScalesDriveBackup.ts` |

Shared types/utilities: [`src/shared/drive/labsDriveBackupTypes.ts`](../../src/shared/drive/labsDriveBackupTypes.ts)

## Workflow

1. Read app hook + conflict module before changing envelope shape
2. Keep **on-screen copy** honest; full OAuth scope in app README
3. ADRs: 0006, 0007, 0011 for policy context
4. **`npm run presubmit`**

## Ask first

- OAuth client or sync contract changes → skill `labs-write-adr`
