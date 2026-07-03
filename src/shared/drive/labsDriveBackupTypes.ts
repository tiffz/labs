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
 * Portfolio merge prompt policy (ADR 0020).
 *
 * - **`silent_union`** (default, only supported policy) — never block pull on divergence alone.
 *   Run row analysis (`labsPortfolioConflictAnalysis`); open review UI only when
 *   `needsReview.length > 0`. Undo snapshots are the safety net.
 * - **`prompt_when_both_edited`** — **deprecated**. Coarse whole-library dialog; always returns
 *   false from {@link shouldPromptPortfolioMerge} (treated as `silent_union`).
 *
 * See `docs/LOCAL_FIRST_SYNC.md` § Divergence vs conflict and ADR 0020.
 */
export type LabsPortfolioMergePromptPolicy = 'silent_union' | 'prompt_when_both_edited';

/** Default for all portfolio backup apps (Stanza, Gesture, Scales, Zine Box). */
export const LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT: LabsPortfolioMergePromptPolicy =
  'silent_union';

/**
 * Whether to show the **coarse** whole-library conflict dialog.
 * Always `false` under ADR 0020 — use {@link shouldBlockSyncForConflict} from
 * `labsPortfolioConflictAnalysis` for true row-level conflicts.
 */
export function shouldPromptPortfolioMerge(params: {
  policy: LabsPortfolioMergePromptPolicy;
  assessment: LabsDriveConflictAssessment;
  localChangedSinceLastBackup: boolean;
}): boolean {
  void params;
  return false;
}

/**
 * @deprecated Always false (ADR 0020). Prefer row analysis + `shouldBlockSyncForConflict`.
 */
export function shouldPromptBeforePortfolioMerge(params: {
  assessment: LabsDriveConflictAssessment;
  localChangedSinceLastBackup: boolean;
}): boolean {
  void params;
  return false;
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
