# shared/drive — Google Drive client + portfolio backup

Cross-app Drive v3 plumbing. App-agnostic: apps supply config, this layer owns transport, layout, merge safety, and recovery.

## Map

| Area                                       | Files                                                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REST client                                | `driveFetch.ts`, `driveFetchErrors.ts`, `driveResumableUpload.ts`                                                                                                    |
| Portfolio backup (per-app `progress.json`) | `createLabsPortfolioDriveBackup.ts`, `labsDrivePortfolioLayout.ts`, `labsDrivePortfolioBackupConstants.ts`, `useLabsDrivePortfolioAutoSync.ts`                       |
| Merge safety                               | `labsPortfolioDriveTombstones.ts` (deletion tombstones), `labsPortfolioConflictAnalysis.ts`, `labsDriveSyncGuard.ts`, `labsPortfolioSilentUnion.integration.test.ts` |
| History / recovery                         | `labsPortfolioDriveHistoryRecovery.ts`, `labsDriveUndoRingDb.ts`, `useLabsPortfolioHistoryRecovery.ts`                                                               |
| Folder import helpers                      | `resolveDriveFolderFromUserInput.ts`, `driveAncestry.ts`, `driveCollectPdfFilesRecursive.ts`                                                                         |
| Public (keyless) reads                     | `buildPublicDriveAltMediaUrl.ts`, `fetchPublicDriveMediaBytes.ts`, `publicDriveFetchPolicy.test.ts`                                                                  |

## Contracts

- **Sync model:** silent union + row-level conflicts only — [ADR 0020](../../../docs/adr/0020-silent-union-sync-row-conflicts-only.md); policy in [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../../../docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md) (includes the per-app divergence matrix).
- **New app backups use the factory** (`createLabsPortfolioDriveBackup`); enforced by `labsPortfolioDriveHookGuardrails.test.ts`.
- **Deletes need tombstones** — local row removal without a tombstone resurrects on merge.
- Sign-in and token flow live in [`../google/`](../google/README.md), not here.

Skill: [`labs-drive-backup`](../../../.cursor/skills/labs-drive-backup/SKILL.md). Sync architecture: [`docs/LOCAL_FIRST_SYNC.md`](../../../docs/LOCAL_FIRST_SYNC.md).
