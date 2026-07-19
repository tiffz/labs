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
import { lyreflyProjectMergeWouldLoseContent } from './lyreflyDriveMerge';

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

/**
 * Row-level conflict analysis for Lyrefly (ADR 0020).
 * Union merge is usually safe; `needsReview` only when the dry run
 * ({@link lyreflyProjectMergeWouldLoseContent}) would drop a title/subtitle.
 */
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
  const localById = new Map(params.local.projects.map((p) => [p.id, p] as const));
  const remoteById = new Map(params.remoteEnvelope.projects.map((p) => [p.id, p] as const));
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
    defaultKind: 'project',
    isAutoResolvable: (localClockRow, remoteClockRow) => {
      const local = localById.get(localClockRow.id);
      const remote = remoteById.get(remoteClockRow.id);
      if (!local || !remote) return true;
      return !lyreflyProjectMergeWouldLoseContent(local, remote);
    },
    summarizeStakes: (localClockRow, remoteClockRow) => {
      const local = localById.get(localClockRow.id);
      const remote = remoteById.get(remoteClockRow.id);
      if (!local || !remote) return undefined;
      const lTitle = local.title.trim() || '(untitled)';
      const rTitle = remote.title.trim() || '(untitled)';
      return lTitle === rTitle ? undefined : `“${lTitle}” here · “${rTitle}” on Drive`;
    },
  });
}
