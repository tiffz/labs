import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';

export type StanzaDriveConflictReason =
  | 'drive_file_newer_than_seen'
  | 'remote_export_newer_than_last_backup'
  | 'drive_nonempty_first_device';

export interface StanzaDriveConflictAssessment {
  needsPrompt: boolean;
  reasons: StanzaDriveConflictReason[];
  /** Short lines for dialogs (no HTML). */
  explainLines: string[];
}

export function assessStanzaDriveBackupConflict(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
}): StanzaDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  const reasons: StanzaDriveConflictReason[] = [];
  const explainLines: string[] = [];

  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [], explainLines: [] };
  }

  const cm = (cloudModifiedTime ?? '').trim();
  const seen = (syncMeta.lastCloudModifiedTime ?? '').trim();
  if (cm && seen && cm > seen) {
    reasons.push('drive_file_newer_than_seen');
    explainLines.push(
      `Google Drive shows this file was edited ${cm} (server time), after the last successful upload this browser recorded (${seen}). That usually means another browser, device, or deployment wrote to the same backup.`,
    );
  }

  const exp = (remoteEnvelope.exportedAt ?? '').trim();
  const lastB = (syncMeta.lastBackupExportedAt ?? '').trim();
  if (exp && lastB && exp > lastB) {
    reasons.push('remote_export_newer_than_last_backup');
    explainLines.push(
      `The backup inside Drive is stamped ${exp}, which is newer than the last export this device uploaded (${lastB}). Merging keeps newer per-song data; replacing overwrites Drive with only this device’s library.`,
    );
  }

  if (!seen && !lastB && remoteEnvelope.songs.length > 0) {
    reasons.push('drive_nonempty_first_device');
    explainLines.push(
      'Drive already has a Stanza library backup, but this device has not successfully uploaded here before. If you continue without merging, the copy on Drive will be replaced by this device’s songs only.',
    );
  }

  return {
    needsPrompt: reasons.length > 0,
    reasons,
    explainLines,
  };
}
