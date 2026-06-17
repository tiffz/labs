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
 * When to show {@link LabsDriveConflictDialog} before pull/backup.
 *
 * - **`silent_union`** (default) — merge in the background; undo snapshots are the
 *   safety net. Use when app merge is union-based and cannot drop local edits.
 * - **`prompt_when_both_edited`** — prompt when cloud diverged and local changed since
 *   last backup. Use only when merge heuristics can hide meaningful differences or
 *   replace-only is a common intentional choice (Stanza section markers).
 *
 * See `docs/LOCAL_FIRST_SYNC.md` § Portfolio merge prompt policy.
 */
export type LabsPortfolioMergePromptPolicy = 'silent_union' | 'prompt_when_both_edited';

/** Default for new portfolio backup apps (Gesture, Scales, …). */
export const LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT: LabsPortfolioMergePromptPolicy =
  'silent_union';

export function shouldPromptPortfolioMerge(params: {
  policy: LabsPortfolioMergePromptPolicy;
  assessment: LabsDriveConflictAssessment;
  localChangedSinceLastBackup: boolean;
}): boolean {
  if (params.policy === 'silent_union') return false;
  if (!params.assessment.needsPrompt) return false;
  return params.localChangedSinceLastBackup;
}

/**
 * @deprecated Prefer {@link shouldPromptPortfolioMerge} with an explicit policy.
 * Implements `prompt_when_both_edited` (legacy Stanza / Scales parity).
 */
export function shouldPromptBeforePortfolioMerge(params: {
  assessment: LabsDriveConflictAssessment;
  localChangedSinceLastBackup: boolean;
}): boolean {
  return shouldPromptPortfolioMerge({
    policy: 'prompt_when_both_edited',
    ...params,
  });
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
