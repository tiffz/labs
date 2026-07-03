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

/** Comic union merge is always auto-resolvable (ADR 0020). */
export function analyzeZineboxConflict(params: {
  syncMeta: ZineboxDriveSyncMeta;
  local: ZineboxSyncPayload;
  remoteEnvelope: ZineboxDriveEnvelopeV1;
}): LabsPortfolioConflictAnalysis {
  const lastSyncedLocalMax = labsPortfolioClockFromIso(params.syncMeta.lastBackupExportedAt);
  const lastRemoteSeen = labsPortfolioClockFromIso(params.syncMeta.lastCloudModifiedTime);
  const remoteUpdatedAt = labsPortfolioClockFromIso(params.remoteEnvelope.exportedAt);
  /** Comics lack per-row clocks; use progress as a weak signal plus envelope baselines. */
  const localClock = (progress: number) => lastSyncedLocalMax + Math.round(progress * 1000);
  const remoteClock = (progress: number) => remoteUpdatedAt + Math.round(progress * 1000);
  return analyzePortfolioRows({
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows: params.local.comics.map((c) => ({
      id: c.id,
      updatedAt: localClock(c.progressPercentage ?? 0),
      label: c.title ?? c.id,
      kind: 'comic',
    })),
    remoteRows: params.remoteEnvelope.comics.map((c) => ({
      id: c.id,
      updatedAt: remoteClock(c.progressPercentage ?? 0),
      label: c.title ?? c.id,
      kind: 'comic',
    })),
    defaultKind: 'comic',
    isAutoResolvable: () => true,
  });
}
