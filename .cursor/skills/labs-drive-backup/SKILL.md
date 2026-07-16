---
name: labs-drive-backup
description: Implements Labs Google Drive backup, conflict prompts, and LabsDriveAccountMenu integration. Use when editing useStanzaDriveBackup, useScalesDriveBackup, useGestureDriveBackup, useZineboxDriveBackup, drive conflict assessment, or Drive sync UX.
---

# Labs Drive backup

## Canonical doc

- [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — architecture, data-loss guards, **divergence vs conflict**, ADR links
- [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../../docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md) — **P0 agent checklist**, guard parity, known gaps
- [ADR 0020](../../docs/adr/0020-silent-union-sync-row-conflicts-only.md) — silent union; prompt only for true row-level conflicts

## Merge prompt policy (required)

Shared: [`labsDriveBackupTypes.ts`](../../src/shared/drive/labsDriveBackupTypes.ts) — `LabsPortfolioMergePromptPolicy`, `shouldPromptPortfolioMerge`, `LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT` (`silent_union`).

Row analysis: [`labsPortfolioConflictAnalysis.ts`](../../src/shared/drive/labsPortfolioConflictAnalysis.ts) — `shouldBlockSyncForConflict(analysis)` when `needsReview.length > 0`.

| App      | Constant                                | Policy                                                   |
| -------- | --------------------------------------- | -------------------------------------------------------- |
| Gesture  | `GESTURE_PORTFOLIO_MERGE_PROMPT_POLICY` | `silent_union`                                           |
| Scales   | `SCALES_PORTFOLIO_MERGE_PROMPT_POLICY`  | `silent_union`                                           |
| Zine Box | `ZINEBOX_PORTFOLIO_MERGE_PROMPT_POLICY` | `silent_union`                                           |
| Stanza   | `STANZA_PORTFOLIO_MERGE_PROMPT_POLICY`  | `silent_union`                                           |
| Lyrefly  | `LYREFLY_PORTFOLIO_MERGE_PROMPT_POLICY` | `silent_union`                                           |
| Encore   | —                                       | row-level review + content-aware merge (ADR 0019 / 0020) |

**Deprecated:** `prompt_when_both_edited` (coarse Merge / Replace dialog). Do not use for new apps.

**New portfolio app checklist:**

1. Add `*DriveConflict.ts` with `assess*DriveBackupConflict` + policy constant (`silent_union`).
2. Implement `analyze*Conflict` (row classifier + optional dry-run for `needsReview`).
3. Use `useLabsDrivePortfolioAutoSync` + `pullFromDriveAndMerge({ silent: true })` on auto-pull.
4. Manual backup: snapshot → pull/merge → `flushDriveWrite` (no coarse dialog).
5. When `needsReview.length > 0`, open [`LabsPortfolioConflictReviewDialog`](../../src/shared/google/LabsPortfolioConflictReviewDialog.tsx).
6. Undo snapshots before merge; expose Restore + Undo last sync.
7. Gate auto-push with `labsDriveAutoPushAllowed`.
8. Bulk imports: `notify*LocalChange({ immediate: true })` so the first edit is not skipped by auto-sync priming.
9. Tab-close safety: portfolio apps inherit debounced push flush from `useLabsDrivePortfolioAutoSync` — do not remove.
10. Delete UX: tombstone + merge filter + test — see [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../../docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md).

Portfolio apps should use [`createLabsPortfolioDriveBackup`](../../src/shared/drive/createLabsPortfolioDriveBackup.ts) unless on the allowlist in `labsPortfolioDriveHookGuardrails.test.ts` (Gesture pack upload, Stanza custom media hydrate).

Do **not** reintroduce a coarse whole-library conflict dialog.

## Shared UI

- Menu shell: [`LabsDriveAccountMenu`](../../src/shared/google/LabsDriveAccountMenu.tsx) — see `SHARED_UI_CONVENTIONS.md` § Drive
- Row review: [`LabsPortfolioConflictReviewDialog`](../../src/shared/google/LabsPortfolioConflictReviewDialog.tsx)
- UI prop types: [`labsDriveBackupUiTypes.ts`](../../src/shared/google/labsDriveBackupUiTypes.ts)

## Shared session hook

[`useLabsDrivePortfolioAutoSync.ts`](../../src/shared/drive/useLabsDrivePortfolioAutoSync.ts) — auto-pull once + debounced auto-push. Shared copy: [`labsDriveSyncMessages.ts`](../../src/shared/drive/labsDriveSyncMessages.ts).

## App hooks (inject merge + envelope)

| App      | Hook                                         |
| -------- | -------------------------------------------- |
| Stanza   | `src/stanza/hooks/useStanzaDriveBackup.ts`   |
| Scales   | `src/scales/hooks/useScalesDriveBackup.ts`   |
| Gesture  | `src/gesture/hooks/useGestureDriveBackup.ts` |
| Zine Box | `src/zinebox/hooks/useZineboxDriveBackup.ts` |
| Lyrefly  | `src/lyrefly/hooks/useLyreflyDriveBackup.ts` |

## Workflow

1. Read [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../../docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md) + [`LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) + ADR 0020 + app hook + merge module before changing envelope shape
2. Keep **on-screen copy** honest; full OAuth scope in app README
3. ADRs: 0006 (conflict UX superseded by 0020), 0007 (+ [revision](../../docs/adr/0007-revision-stanza-encore-federated-sync.md)), 0010, 0011, 0012, 0019, **0020**
4. **`npm run presubmit`**

## Ask first

- OAuth client or sync contract changes → skill `labs-write-adr`
- Changing an app’s merge prompt policy → update `LOCAL_FIRST_SYNC.md` policy table + `*DriveConflict.ts` comment
- Stanza ↔ Encore overlay migration → product sign-off on ADR 0007 revision
