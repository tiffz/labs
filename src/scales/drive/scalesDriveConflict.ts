import type { ScalesDriveSyncMeta } from './scalesDriveSyncMeta';
import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';

export type ScalesDriveConflictReason =
  | 'drive_file_newer_than_seen'
  | 'remote_export_newer_than_last_backup'
  | 'drive_nonempty_first_device';

export interface ScalesDriveConflictAssessment {
  needsPrompt: boolean;
  reasons: ScalesDriveConflictReason[];
}

export function assessScalesDriveBackupConflict(params: {
  syncMeta: ScalesDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: ScalesDriveEnvelopeV1 | null;
}): ScalesDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  const reasons: ScalesDriveConflictReason[] = [];

  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }

  const cm = (cloudModifiedTime ?? '').trim();
  const seen = (syncMeta.lastCloudModifiedTime ?? '').trim();
  if (cm && seen && cm > seen) {
    reasons.push('drive_file_newer_than_seen');
  }

  const exp = (remoteEnvelope.exportedAt ?? '').trim();
  const lastB = (syncMeta.lastBackupExportedAt ?? '').trim();
  if (exp && lastB && exp > lastB) {
    reasons.push('remote_export_newer_than_last_backup');
  }

  const hasRemoteProgress = Object.keys(remoteEnvelope.payload.exercises ?? {}).length > 0;
  if (!seen && !lastB && hasRemoteProgress) {
    reasons.push('drive_nonempty_first_device');
  }

  return {
    needsPrompt: reasons.length > 0,
    reasons,
  };
}
