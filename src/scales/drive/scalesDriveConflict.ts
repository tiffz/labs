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
import { scalesExerciseMergeWouldLoseContent } from './scalesDriveMerge';

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
 * Row-level conflict analysis for Learn Your Scales (ADR 0020).
 * Per-exercise union merge is usually safe; `needsReview` only when the dry run
 * ({@link scalesExerciseMergeWouldLoseContent}) would drop earned stage progress.
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
  const localExercises = params.local.exercises ?? {};
  const remoteExercises = params.remoteEnvelope.payload.exercises ?? {};
  const localIds = Object.keys(localExercises);
  const remoteIds = Object.keys(remoteExercises);
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
    isAutoResolvable: (localRow, remoteRow) => {
      const local = localExercises[localRow.id];
      const remote = remoteExercises[remoteRow.id];
      if (!local || !remote) return true;
      return !scalesExerciseMergeWouldLoseContent(local, remote);
    },
  });
}
