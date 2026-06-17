---
name: labs-drive-backup
description: Implements Labs Google Drive backup, conflict prompts, and LabsDriveAccountMenu integration. Use when editing useStanzaDriveBackup, useScalesDriveBackup, useGestureDriveBackup, drive conflict assessment, or Drive sync UX.
---

# Labs Drive backup

## Canonical doc

[`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — architecture, data-loss guards, **portfolio merge prompt policy**, ADR links.

## Merge prompt policy (required)

Shared: [`labsDriveBackupTypes.ts`](../../src/shared/drive/labsDriveBackupTypes.ts) — `LabsPortfolioMergePromptPolicy`, `shouldPromptPortfolioMerge`, `LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT` (`silent_union`).

| App     | Constant                                | Policy                                                      |
| ------- | --------------------------------------- | ----------------------------------------------------------- |
| Gesture | `GESTURE_PORTFOLIO_MERGE_PROMPT_POLICY` | `silent_union`                                              |
| Scales  | `SCALES_PORTFOLIO_MERGE_PROMPT_POLICY`  | `silent_union`                                              |
| Stanza  | `STANZA_PORTFOLIO_MERGE_PROMPT_POLICY`  | `prompt_when_both_edited`                                   |
| Encore  | —                                       | row-level `SyncConflictReviewDialog` (not portfolio policy) |

**New portfolio app checklist:**

1. Add `*DriveConflict.ts` with `assess*DriveBackupConflict` + policy constant (default `silent_union` unless documented divergence).
2. Use `useLabsDrivePortfolioAutoSync` + `pullFromDriveAndMerge({ silent: true })` on auto-pull.
3. Manual backup: snapshot → pull/merge → `flushDriveWrite` (no dialog for `silent_union`).
4. Undo snapshots before merge; expose Restore + Undo last sync.
5. Gate auto-push with `labsDriveAutoPushAllowed`.

Do **not** copy Stanza’s conflict dialog into new apps without an ADR/note explaining why union merge is insufficient.

## Shared UI

- Menu shell: [`LabsDriveAccountMenu`](../../src/shared/google/LabsDriveAccountMenu.tsx) — see `SHARED_UI_CONVENTIONS.md` § Drive
- UI prop types: [`labsDriveBackupUiTypes.ts`](../../src/shared/google/labsDriveBackupUiTypes.ts)

## Shared session hook

[`useLabsDrivePortfolioAutoSync.ts`](../../src/shared/drive/useLabsDrivePortfolioAutoSync.ts) — auto-pull once + debounced auto-push. Shared copy: [`labsDriveSyncMessages.ts`](../../src/shared/drive/labsDriveSyncMessages.ts).

## App hooks (inject merge + envelope)

| App     | Hook                                         |
| ------- | -------------------------------------------- |
| Stanza  | `src/stanza/hooks/useStanzaDriveBackup.ts`   |
| Scales  | `src/scales/hooks/useScalesDriveBackup.ts`   |
| Gesture | `src/gesture/hooks/useGestureDriveBackup.ts` |

## Workflow

1. Read [`LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) + app hook + merge module before changing envelope shape
2. Keep **on-screen copy** honest; full OAuth scope in app README
3. ADRs: 0006, 0007 (+ [revision](../../docs/adr/0007-revision-stanza-encore-federated-sync.md)), 0010, 0011, 0012
4. **`npm run presubmit`**

## Ask first

- OAuth client or sync contract changes → skill `labs-write-adr`
- Changing an app’s merge prompt policy → update `LOCAL_FIRST_SYNC.md` policy table + `*DriveConflict.ts` comment
- Stanza ↔ Encore overlay migration → product sign-off on ADR 0007 revision
