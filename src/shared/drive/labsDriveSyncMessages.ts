import { DriveHttpError } from './driveFetch';
import { LabsGoogleInteractiveAuthRequiredError } from '../google/labsGoogleDriveAccess';

export const LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE =
  'Drive sync paused — sign in or retry pull before edits sync to Drive.';

export const LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL = 'Sign in to sync';

export type LabsDriveSyncOperation = 'auto-pull' | 'pull' | 'auto-push' | 'push';

const AUTH_REQUIRED: Record<LabsDriveSyncOperation, string> = {
  'auto-pull': 'Drive sync paused. Sign in again to pull the latest from Drive.',
  pull: 'Drive sync paused. Sign in again to pull the latest from Drive.',
  'auto-push': 'Drive sync paused. Sign in again to back up edits to Drive.',
  push: 'Drive sync paused. Sign in again to back up edits to Drive.',
};

const GENERIC_FAILED: Record<LabsDriveSyncOperation, string> = {
  'auto-pull': 'Drive auto-pull failed.',
  pull: 'Drive pull failed.',
  'auto-push': 'Drive auto-push failed.',
  push: 'Backup failed.',
};

/** Map sync errors to user-visible account-menu copy (portfolio apps). */
export function formatLabsDriveSyncError(error: unknown, operation: LabsDriveSyncOperation): string {
  if (error instanceof LabsGoogleInteractiveAuthRequiredError) {
    return AUTH_REQUIRED[operation];
  }
  if (error instanceof DriveHttpError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return GENERIC_FAILED[operation];
}

/** True when message should render as warning (reconnect) in LabsAccountMenu. */
export function labsDriveSyncMessageNeedsSignIn(message: string): boolean {
  return /sign in again|sync paused|aborted|cancel(l)?ed|closed before finishing/i.test(message);
}

/** True when message should render as error in LabsAccountMenu. */
export function labsDriveSyncMessageIsFailure(message: string): boolean {
  return /failed|error|403|401|timed out/i.test(message) && !labsDriveSyncMessageNeedsSignIn(message);
}

/** Success/info copy that belongs in a dismissible toast, not a persistent account-menu alert. */
export function labsDriveSyncMessageIsTransientSuccess(message: string): boolean {
  if (labsDriveSyncMessageIsFailure(message)) return false;
  if (labsDriveSyncMessageNeedsSignIn(message)) return false;
  if (/open your account menu/i.test(message)) return false;
  if (/no .* backup on drive yet/i.test(message)) return false;
  if (/no undo-last-sync/i.test(message)) return false;

  return (
    /^Synced from Drive/i.test(message) ||
    /^Already in sync/i.test(message) ||
    /saved to Google Drive/i.test(message) ||
    /^Saved to Drive\./i.test(message) ||
    /^Progress saved/i.test(message) ||
    /^Organize:/i.test(message)
  );
}
