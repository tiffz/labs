import {
  assessLabsDriveBackupConflict,
  LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { ScalesProgressData } from '../progress/types';
import type { ScalesDriveSyncMeta } from './scalesDriveSyncMeta';
import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';

export type ScalesDriveConflictReason = LabsDriveConflictReason;
export type ScalesDriveConflictAssessment = LabsDriveConflictAssessment;

/** Per-exercise union merge keeps the furthest stage and unions history — silent sync default. */
export const SCALES_PORTFOLIO_MERGE_PROMPT_POLICY = LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT;

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

export function shouldPromptScalesDriveMerge(params: {
  syncMeta: ScalesDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: ScalesDriveEnvelopeV1 | null;
  progress: ScalesProgressData;
}): boolean {
  const assessment = assessScalesDriveBackupConflict(params);
  const localMs = Date.parse(params.progress.progressUpdatedAt ?? '');
  return shouldPromptPortfolioMerge({
    policy: SCALES_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      Number.isFinite(localMs) ? localMs : 0,
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}
