/**
 * Drive backup orchestration for Learn Your Scales — portfolio auto pull/push via shared factory.
 */

import { createLabsPortfolioDriveBackup } from '../../shared/drive/createLabsPortfolioDriveBackup';
import {
  scalesPortfolioDriveBackupConfig,
  type ScalesDriveBackupConflictState,
} from '../drive/scalesPortfolioDriveBackupConfig';
import { setScalesPortfolioDriveProgress } from '../drive/scalesPortfolioDriveProgressHolder';
import type { ScalesDriveEnvelopeV1 } from '../drive/scalesDriveEnvelope';
import type { ScalesDriveUndoSnapshot } from '../drive/scalesDriveUndoSnapshots';
import type { ScalesProgressData } from '../progress/types';

export function scalesGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type { ScalesDriveBackupConflictState };

export type UseScalesDriveBackupOptions = {
  progress: ScalesProgressData;
  onMergeProgress: (progress: ScalesProgressData) => void;
};

const useScalesPortfolioDriveBackup = createLabsPortfolioDriveBackup(scalesPortfolioDriveBackupConfig);

export function useScalesDriveBackup({ progress, onMergeProgress }: UseScalesDriveBackupOptions) {
  setScalesPortfolioDriveProgress(progress);

  const backup = useScalesPortfolioDriveBackup({
    onMergePayload: async (merged) => {
      onMergeProgress(merged);
    },
  });

  return {
    ...backup,
    undoSnapshots: backup.undoSnapshots as ScalesDriveUndoSnapshot[],
    applyUndoSnapshot: backup.applyUndoSnapshot!,
    restoreLatestPrePullSnapshot: backup.restoreLatestPrePullSnapshot!,
    restoreLatestFromDrive: backup.restoreLatestFromDrive!,
    formatScalesDriveUndoSnapshotTrigger: backup.formatUndoSnapshotTrigger!,
    latestRemoteEnvelope: backup.latestRemoteEnvelope as ScalesDriveEnvelopeV1 | null,
  };
}
