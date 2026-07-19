/**
 * Drive backup orchestration for Gesture — portfolio auto pull/push, merge, conflict UI.
 * Built on the shared portfolio factory; pack folder reconciliation and photo
 * re-indexing run through the factory's sidecar hooks.
 */

import { createLabsPortfolioDriveBackup } from '../../shared/drive/createLabsPortfolioDriveBackup';
import {
  gesturePortfolioDriveBackupConfig,
  type GestureDriveBackupConflictState,
} from '../drive/gesturePortfolioDriveBackupConfig';
import type { GestureSyncPayload } from '../types';
import type { GestureDriveUndoSnapshot } from '../drive/gestureDriveUndoSnapshots';

export function gestureGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type { GestureDriveBackupConflictState };

export type UseGestureDriveBackupOptions = {
  onMergePayload: (payload: GestureSyncPayload) => Promise<void>;
};

const useGesturePortfolioDriveBackup = createLabsPortfolioDriveBackup(
  gesturePortfolioDriveBackupConfig,
);

export function useGestureDriveBackup({ onMergePayload }: UseGestureDriveBackupOptions) {
  const backup = useGesturePortfolioDriveBackup({ onMergePayload });
  return {
    ...backup,
    undoSnapshots: backup.undoSnapshots as GestureDriveUndoSnapshot[],
    applyUndoSnapshot: backup.applyUndoSnapshot!,
    restoreLatestPrePullSnapshot: backup.restoreLatestPrePullSnapshot!,
    restoreLatestFromDrive: backup.restoreLatestFromDrive!,
    formatGestureDriveUndoSnapshotTrigger: backup.formatUndoSnapshotTrigger!,
  };
}
