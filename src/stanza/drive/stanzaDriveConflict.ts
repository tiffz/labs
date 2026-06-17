import {
  assessLabsDriveBackupConflict,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
  type LabsPortfolioMergePromptPolicy,
} from '../../shared/drive/labsDriveBackupTypes';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';

export type StanzaDriveConflictReason = LabsDriveConflictReason;
export type StanzaDriveConflictAssessment = LabsDriveConflictAssessment;

/**
 * Stanza diverges from the portfolio default: per-song section markers and Drive
 * source links can diverge in ways users should consciously merge or replace.
 */
export const STANZA_PORTFOLIO_MERGE_PROMPT_POLICY: LabsPortfolioMergePromptPolicy =
  'prompt_when_both_edited';

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
  return shouldPromptPortfolioMerge({
    policy: STANZA_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      stanzaLocalMaxUpdatedAtMs(params.localRows),
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}
