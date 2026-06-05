import {
  assessLabsDriveBackupConflict,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptBeforePortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';

export type StanzaDriveConflictReason = LabsDriveConflictReason;
export type StanzaDriveConflictAssessment = LabsDriveConflictAssessment;

export function stanzaLocalMaxUpdatedAtMs(rows: readonly StanzaSong[]): number {
  return rows.reduce((max, row) => Math.max(max, row.updatedAt), 0);
}

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

export function shouldPromptStanzaDriveMerge(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
  localRows: readonly StanzaSong[];
}): boolean {
  const assessment = assessStanzaDriveBackupConflict(params);
  return shouldPromptBeforePortfolioMerge({
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      stanzaLocalMaxUpdatedAtMs(params.localRows),
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}
