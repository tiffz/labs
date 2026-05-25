import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';

export type StanzaDriveConflictReason =
  | 'drive_file_newer_than_seen'
  | 'remote_export_newer_than_last_backup'
  | 'drive_nonempty_first_device';

export interface StanzaDriveConflictAssessment {
  needsPrompt: boolean;
  reasons: StanzaDriveConflictReason[];
}

export function assessStanzaDriveBackupConflict(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
}): StanzaDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  const reasons: StanzaDriveConflictReason[] = [];

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

  if (!seen && !lastB && remoteEnvelope.songs.length > 0) {
    reasons.push('drive_nonempty_first_device');
  }

  return {
    needsPrompt: reasons.length > 0,
    reasons,
  };
}
