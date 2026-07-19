/** Debounced auto-push quiet period (Stanza, Scales, Gesture portfolio apps). */
export const LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS = 3_000;

/** Minimum ms between consecutive auto-pushes on the same session. */
export const LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS = 4_000;

/** Silent re-pull interval while the tab is visible (cross-device sync). */
export const LABS_DRIVE_AUTO_PULL_INTERVAL_MS = 5 * 60 * 1000;

/** Minimum ms between visibility-triggered silent re-pulls. */
export const LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS = 2 * 60 * 1000;

/** First retry delay after an auto-sync (pull or push) failure. */
export const LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS = 30_000;

/** Backoff ceiling — retries never wait longer than this. */
export const LABS_DRIVE_AUTO_SYNC_BACKOFF_MAX_MS = 15 * 60 * 1000;

/** Exponential backoff delay for the given consecutive-failure count (1-based). */
export function labsDriveAutoSyncBackoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  return Math.min(
    LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1),
    LABS_DRIVE_AUTO_SYNC_BACKOFF_MAX_MS,
  );
}
