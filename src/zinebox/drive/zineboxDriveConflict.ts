import {
  assessLabsDriveBackupConflict,
  LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { ZineboxDriveEnvelopeV1 } from './zineboxDriveEnvelope';
import type { ZineboxDriveSyncMeta } from './zineboxDriveSyncMeta';
import type { ZineboxSyncPayload } from './zineboxDriveEnvelope';

export type ZineboxDriveConflictReason = LabsDriveConflictReason;
export type ZineboxDriveConflictAssessment = LabsDriveConflictAssessment;

/** Union merge for comics, stacks, and reading progress — silent sync default. */
export const ZINEBOX_PORTFOLIO_MERGE_PROMPT_POLICY = LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT;

export function assessZineboxDriveBackupConflict(params: {
  syncMeta: ZineboxDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: ZineboxDriveEnvelopeV1 | null;
}): ZineboxDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }
  const hasRemoteContent =
    remoteEnvelope.comics.length > 0 || remoteEnvelope.collections.length > 0;
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: hasRemoteContent,
  });
}

export function shouldPromptZineboxDriveMerge(params: {
  syncMeta: ZineboxDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: ZineboxDriveEnvelopeV1 | null;
  local: ZineboxSyncPayload;
  localUpdatedAtMs: number;
}): boolean {
  const assessment = assessZineboxDriveBackupConflict(params);
  return shouldPromptPortfolioMerge({
    policy: ZINEBOX_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      params.localUpdatedAtMs,
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}
