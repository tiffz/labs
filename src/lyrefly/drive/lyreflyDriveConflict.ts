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
import type { LyreflyDriveEnvelopeV1, LyreflySyncPayload } from './lyreflyDriveEnvelope';
import type { LyreflyDriveSyncMeta } from './lyreflyDriveSyncMeta';

export type LyreflyDriveConflictReason = LabsDriveConflictReason;
export type LyreflyDriveConflictAssessment = LabsDriveConflictAssessment;

export const LYREFLY_PORTFOLIO_MERGE_PROMPT_POLICY = LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT;

export function assessLyreflyDriveBackupConflict(params: {
  syncMeta: LyreflyDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: LyreflyDriveEnvelopeV1 | null;
}): LyreflyDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }
  const hasRemoteContent = remoteEnvelope.projects.length > 0;
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: hasRemoteContent,
  });
}

export function shouldPromptLyreflyDriveMerge(params: {
  syncMeta: LyreflyDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: LyreflyDriveEnvelopeV1 | null;
  local: LyreflySyncPayload;
  localUpdatedAtMs: number;
}): boolean {
  const assessment = assessLyreflyDriveBackupConflict(params);
  return shouldPromptPortfolioMerge({
    policy: LYREFLY_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      params.localUpdatedAtMs,
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}

export function analyzeLyreflyConflict(params: {
  syncMeta: LyreflyDriveSyncMeta;
  local: LyreflySyncPayload;
  remoteEnvelope: LyreflyDriveEnvelopeV1;
}): LabsPortfolioConflictAnalysis {
  const lastSyncedLocalMax = labsPortfolioClockFromIso(params.syncMeta.lastBackupExportedAt);
  const lastRemoteSeen = labsPortfolioClockFromIso(params.syncMeta.lastCloudModifiedTime);
  const remoteUpdatedAt = labsPortfolioClockFromIso(params.remoteEnvelope.exportedAt);
  const localClock = (updatedAt: string) =>
    Math.max(lastSyncedLocalMax, labsPortfolioClockFromIso(updatedAt));
  const remoteClock = (updatedAt: string) =>
    Math.max(remoteUpdatedAt, labsPortfolioClockFromIso(updatedAt));
  return analyzePortfolioRows({
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows: params.local.projects.map((p) => ({
      id: p.id,
      updatedAt: localClock(p.updatedAt),
      label: p.title ?? p.id,
      kind: 'project',
    })),
    remoteRows: params.remoteEnvelope.projects.map((p) => ({
      id: p.id,
      updatedAt: remoteClock(p.updatedAt),
      label: p.title ?? p.id,
      kind: 'project',
    })),
  });
}
