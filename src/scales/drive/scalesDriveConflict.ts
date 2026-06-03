import {
  assessLabsDriveBackupConflict,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { ScalesDriveSyncMeta } from './scalesDriveSyncMeta';
import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';

export type ScalesDriveConflictReason = LabsDriveConflictReason;
export type ScalesDriveConflictAssessment = LabsDriveConflictAssessment;

export function assessScalesDriveBackupConflict(params: {
  syncMeta: ScalesDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: ScalesDriveEnvelopeV1 | null;
}): ScalesDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }
  const hasRemoteProgress = Object.keys(remoteEnvelope.payload.exercises ?? {}).length > 0;
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: hasRemoteProgress,
  });
}
