import {
  assessLabsDriveBackupConflict,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';

export type StanzaDriveConflictReason = LabsDriveConflictReason;
export type StanzaDriveConflictAssessment = LabsDriveConflictAssessment;

export function assessStanzaDriveBackupConflict(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
}): StanzaDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: remoteEnvelope.songs.length > 0,
  });
}
