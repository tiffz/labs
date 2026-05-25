/**
 * Whether debounced auto-push to Drive is allowed this session.
 * Auto-push must not run until a successful pull (or explicit manual backup)
 * so a fresh/sparse device cannot overwrite richer cloud data.
 */
export function labsDriveAutoPushAllowed(pullSucceeded: boolean, manualBackupSucceeded: boolean): boolean {
  return pullSucceeded || manualBackupSucceeded;
}
