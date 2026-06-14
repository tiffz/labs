import {
  assessLabsDriveBackupConflict,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptBeforePortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
} from '../../shared/drive/labsDriveBackupTypes';
import type { GestureSyncPayload } from '../types';
import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import type { GestureDriveSyncMeta } from './gestureDriveSyncMeta';
import { gestureLocalProgressUpdatedAt } from '../db/gestureLocalData';

export type GestureDriveConflictReason = LabsDriveConflictReason;
export type GestureDriveConflictAssessment = LabsDriveConflictAssessment;

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
  return shouldPromptBeforePortfolioMerge({
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      Number.isFinite(localMs) ? localMs : 0,
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}
