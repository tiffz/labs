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
import type { GestureSyncPayload } from '../types';
import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import type { GestureDriveSyncMeta } from './gestureDriveSyncMeta';
import { gestureLocalProgressUpdatedAt } from '../db/gestureLocalData';
import { gesturePackMergeWouldLoseContent } from './gestureDriveMerge';

export type GestureDriveConflictReason = LabsDriveConflictReason;
export type GestureDriveConflictAssessment = LabsDriveConflictAssessment;

/** Gesture union merge cannot drop local packs or draw history — silent sync default. */
export const GESTURE_PORTFOLIO_MERGE_PROMPT_POLICY = LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT;

export function assessGestureDriveBackupConflict(params: {
  syncMeta: GestureDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: GestureDriveEnvelopeV1 | null;
}): GestureDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) return { needsPrompt: false, reasons: [] };
  const hasRemoteProgress =
    remoteEnvelope.packs.length > 0 || remoteEnvelope.drawHistory.length > 0;
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: hasRemoteProgress,
  });
}

export function shouldPromptGestureDriveMerge(params: {
  syncMeta: GestureDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: GestureDriveEnvelopeV1 | null;
  localPayload: GestureSyncPayload;
}): boolean {
  const assessment = assessGestureDriveBackupConflict(params);
  const localUpdatedAt = gestureLocalProgressUpdatedAt(params.localPayload);
  const localMs = Date.parse(localUpdatedAt ?? '');
  return shouldPromptPortfolioMerge({
    policy: GESTURE_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      Number.isFinite(localMs) ? localMs : 0,
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}

/**
 * Row-level conflict analysis for Gesture (ADR 0020).
 * Pack union merge is usually safe; `needsReview` only when the dry run
 * ({@link gesturePackMergeWouldLoseContent}) would drop pack metadata
 * (name/notes/subject/source) both sides edited.
 */
export function analyzeGestureConflict(params: {
  syncMeta: GestureDriveSyncMeta;
  local: GestureSyncPayload;
  remoteEnvelope: GestureDriveEnvelopeV1;
}): LabsPortfolioConflictAnalysis {
  const lastSyncedLocalMax = labsPortfolioClockFromIso(params.syncMeta.lastBackupExportedAt);
  const lastRemoteSeen = labsPortfolioClockFromIso(params.syncMeta.lastCloudModifiedTime);
  const localUpdatedAt = labsPortfolioClockFromIso(gestureLocalProgressUpdatedAt(params.local));
  const remoteUpdatedAt = labsPortfolioClockFromIso(params.remoteEnvelope.exportedAt);
  const localById = new Map(params.local.packs.map((p) => [p.id, p] as const));
  const remoteById = new Map(params.remoteEnvelope.packs.map((p) => [p.id, p] as const));
  return analyzePortfolioRows({
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows: params.local.packs.map((p) => ({
      id: p.id,
      updatedAt: localUpdatedAt,
      label: p.name,
      kind: 'pack',
    })),
    remoteRows: params.remoteEnvelope.packs.map((p) => ({
      id: p.id,
      updatedAt: remoteUpdatedAt,
      label: p.name,
      kind: 'pack',
    })),
    defaultKind: 'pack',
    isAutoResolvable: (localRow, remoteRow) => {
      const local = localById.get(localRow.id);
      const remote = remoteById.get(remoteRow.id);
      if (!local || !remote) return true;
      return !gesturePackMergeWouldLoseContent(local, remote);
    },
    summarizeStakes: (local, remote) => {
      const localFiles = params.local.packFiles ?? [];
      const remoteFiles = params.remoteEnvelope.packFiles ?? [];
      const lCount = localFiles.filter((f) => f.packId === local.id).length;
      const rCount = remoteFiles.filter((f) => f.packId === remote.id).length;
      return `${lCount} photo${lCount === 1 ? '' : 's'} here · ${rCount} on Drive`;
    },
  });
}
