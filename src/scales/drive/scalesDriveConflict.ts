import {
  assessLabsDriveBackupConflict,
  LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import {
  analyzePortfolioRows,
  labsPortfolioClockFromIso,
  type LabsPortfolioConflictAnalysis,
} from '../../shared/drive/labsPortfolioConflictAnalysis';
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

/**
 * Per-exercise union merge is always auto-resolvable (ADR 0020).
 * `needsReview` stays empty; analysis still classifies localOnly / remoteOnly for diagnostics.
 */
export function analyzeScalesConflict(params: {
  syncMeta: ScalesDriveSyncMeta;
  local: ScalesProgressData;
  remoteEnvelope: ScalesDriveEnvelopeV1;
}): LabsPortfolioConflictAnalysis {
  const lastSyncedLocalMax = labsPortfolioClockFromIso(params.syncMeta.lastBackupExportedAt);
  const lastRemoteSeen = labsPortfolioClockFromIso(params.syncMeta.lastCloudModifiedTime);
  const localUpdatedAt = labsPortfolioClockFromIso(params.local.progressUpdatedAt);
  const remoteUpdatedAt = labsPortfolioClockFromIso(params.remoteEnvelope.exportedAt);
  const localIds = Object.keys(params.local.exercises ?? {});
  const remoteIds = Object.keys(params.remoteEnvelope.payload.exercises ?? {});
  return analyzePortfolioRows({
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows: localIds.map((id) => ({
      id,
      updatedAt: localUpdatedAt,
      label: id,
      kind: 'exercise',
    })),
    remoteRows: remoteIds.map((id) => ({
      id,
      updatedAt: remoteUpdatedAt,
      label: id,
      kind: 'exercise',
    })),
    defaultKind: 'exercise',
    isAutoResolvable: () => true,
  });
}
