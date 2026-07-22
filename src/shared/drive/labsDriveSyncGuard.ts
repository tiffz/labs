/**
 * Whether debounced auto-push to Drive is allowed this session.
 * Auto-push must not run until a successful pull (or explicit manual backup)
 * so a fresh/sparse device cannot overwrite richer cloud data.
 */
export function labsDriveAutoPushAllowed(pullSucceeded: boolean, manualBackupSucceeded: boolean): boolean {
  return pullSucceeded || manualBackupSucceeded;
}

/**
 * A Drive write was attempted before this session completed a reconciling pull
 * (or manual backup) and without an explicit user-confirmed replace token. Writing
 * would push local-only state over richer cloud data. The write primitive fails
 * closed and throws this instead of overwriting (ADR 0020;
 * DRIVE_SYNC_DATA_LOSS_PREVENTION Layer 2; red-team #9/#10/#11/#18).
 */
export class LabsDriveAutoPushBlockedError extends Error {
  constructor(appFolderName: string) {
    super(
      `Backup for ${appFolderName} is paused until this device syncs from Drive, so the copy on Drive is not overwritten. It backs up automatically once the first sync finishes.`,
    );
    this.name = 'LabsDriveAutoPushBlockedError';
  }
}

/**
 * Choke-point gate for every Drive write. Refuses a write when auto-push is not
 * yet allowed (no reconciling pull this session) unless the caller threads an
 * explicit user-confirmed replace token. Living inside the write primitive makes
 * "no push before a reconciling pull" structural, not a caller convention, so
 * every present and future direct caller inherits it (red-team #11).
 */
export function assertLabsDriveWriteAllowed(params: {
  appFolderName: string;
  autoPushAllowed: boolean;
  intentionalReplace: boolean;
}): void {
  if (params.intentionalReplace || params.autoPushAllowed) return;
  throw new LabsDriveAutoPushBlockedError(params.appFolderName);
}
