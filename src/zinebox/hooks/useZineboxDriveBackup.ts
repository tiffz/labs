/**
 * Drive backup orchestration for Zine Box — portfolio auto pull/push, PDF sync, merge, restore.
 */

import { createLabsPortfolioDriveBackup } from '../../shared/drive/createLabsPortfolioDriveBackup';
import {
  zineboxPortfolioDriveBackupConfig,
  type ZineboxDriveBackupConflictState,
} from '../drive/zineboxPortfolioDriveBackupConfig';
import type { ZineboxSyncPayload } from '../drive/zineboxDriveEnvelope';
import type { ZineboxDriveUndoSnapshot } from '../drive/zineboxDriveUndoSnapshots';

export function zineboxGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type { ZineboxDriveBackupConflictState };

export type UseZineboxDriveBackupOptions = {
  onMergePayload: (payload: ZineboxSyncPayload) => Promise<void>;
};

const useZineboxPortfolioDriveBackup = createLabsPortfolioDriveBackup(zineboxPortfolioDriveBackupConfig);

export function useZineboxDriveBackup({ onMergePayload }: UseZineboxDriveBackupOptions) {
  const backup = useZineboxPortfolioDriveBackup({ onMergePayload });
  return {
    ...backup,
    undoSnapshots: backup.undoSnapshots as ZineboxDriveUndoSnapshot[],
    applyUndoSnapshot: backup.applyUndoSnapshot!,
    restoreLatestPrePullSnapshot: backup.restoreLatestPrePullSnapshot!,
    restoreLatestFromDrive: backup.restoreLatestFromDrive!,
    formatZineboxDriveUndoSnapshotTrigger: backup.formatUndoSnapshotTrigger!,
  };
}
