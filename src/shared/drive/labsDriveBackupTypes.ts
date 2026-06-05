/**
 * Shared Drive backup conflict assessment (Stanza, Scales, future apps).
 * App hooks supply envelope-specific "has remote content" checks.
 */

export type LabsDriveConflictReason =
  | 'drive_file_newer_than_seen'
  | 'remote_export_newer_than_last_backup'
  | 'drive_nonempty_first_device';

export interface LabsDriveConflictAssessment {
  needsPrompt: boolean;
  reasons: LabsDriveConflictReason[];
}

/**
 * Whether to show the merge/replace dialog before applying a Drive pull.
 * Silent merge is allowed when the cloud looks newer but this device has no local
 * edits since the last backup (merge cannot drop local work).
 */
export function shouldPromptBeforePortfolioMerge(params: {
  assessment: LabsDriveConflictAssessment;
  localChangedSinceLastBackup: boolean;
}): boolean {
  if (!params.assessment.needsPrompt) return false;
  return params.localChangedSinceLastBackup;
}

/** Compare a local monotonic clock (ms) to the last exported backup timestamp. */
export function labsPortfolioLocalChangedSinceIsoBackup(
  localMaxUpdatedAtMs: number,
  lastBackupExportedAt: string | undefined | null,
): boolean {
  if (localMaxUpdatedAtMs <= 0) return false;
  const lastB = (lastBackupExportedAt ?? '').trim();
  if (!lastB) return true;
  const lastMs = Date.parse(lastB);
  if (!Number.isFinite(lastMs)) return true;
  return localMaxUpdatedAtMs > lastMs;
}

export interface LabsDriveSyncMetaFields {
  lastCloudModifiedTime?: string | null;
  lastBackupExportedAt?: string | null;
}

export function assessLabsDriveBackupConflict(params: {
  syncMeta: LabsDriveSyncMetaFields;
  cloudModifiedTime: string | undefined;
  remoteExportedAt: string | undefined;
  remoteHasContent: boolean;
}): LabsDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteExportedAt, remoteHasContent } = params;
  const reasons: LabsDriveConflictReason[] = [];

  const cm = (cloudModifiedTime ?? '').trim();
  const seen = (syncMeta.lastCloudModifiedTime ?? '').trim();
  if (cm && seen && cm > seen) {
    reasons.push('drive_file_newer_than_seen');
  }

  const exp = (remoteExportedAt ?? '').trim();
  const lastB = (syncMeta.lastBackupExportedAt ?? '').trim();
  if (exp && lastB && exp > lastB) {
    reasons.push('remote_export_newer_than_last_backup');
  }

  if (!seen && !lastB && remoteHasContent) {
    reasons.push('drive_nonempty_first_device');
  }

  return {
    needsPrompt: reasons.length > 0,
    reasons,
  };
}
