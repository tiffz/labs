import {
  assessLabsDriveBackupConflict,
  LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { GestureSyncPayload } from '../types';
import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import type { GestureDriveSyncMeta } from './gestureDriveSyncMeta';
import { gestureLocalProgressUpdatedAt } from '../db/gestureLocalData';

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
