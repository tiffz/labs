import { createLabsPortfolioDriveBackup } from '../../shared/drive/createLabsPortfolioDriveBackup';
import {
  lyreflyPortfolioDriveBackupConfig,
  type LyreflyDriveBackupConflictState,
} from '../drive/lyreflyPortfolioDriveBackupConfig';
import type { LyreflySyncPayload } from '../drive/lyreflyDriveEnvelope';
import type { LyreflyDriveUndoSnapshot } from '../drive/lyreflyDriveUndoSnapshots';

export function lyreflyGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type { LyreflyDriveBackupConflictState };

export type UseLyreflyDriveBackupOptions = {
  onMergePayload: (payload: LyreflySyncPayload) => Promise<void>;
};

const useLyreflyPortfolioDriveBackup = createLabsPortfolioDriveBackup(lyreflyPortfolioDriveBackupConfig);

export function useLyreflyDriveBackup({ onMergePayload }: UseLyreflyDriveBackupOptions) {
  const backup = useLyreflyPortfolioDriveBackup({ onMergePayload });
  return {
    ...backup,
    undoSnapshots: backup.undoSnapshots as LyreflyDriveUndoSnapshot[],
    applyUndoSnapshot: backup.applyUndoSnapshot!,
    restoreLatestPrePullSnapshot: backup.restoreLatestPrePullSnapshot!,
    restoreLatestFromDrive: backup.restoreLatestFromDrive!,
    formatLyreflyDriveUndoSnapshotTrigger: backup.formatUndoSnapshotTrigger!,
  };
}
