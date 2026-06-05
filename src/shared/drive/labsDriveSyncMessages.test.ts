import { describe, expect, it } from 'vitest';
import { DriveHttpError } from './driveFetch';
import {
  formatLabsDriveSyncError,
  LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE,
  LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL,
  labsDriveSyncMessageIsFailure,
  labsDriveSyncMessageNeedsSignIn,
} from './labsDriveSyncMessages';
import { LabsGoogleInteractiveAuthRequiredError } from '../google/labsGoogleDriveAccess';

describe('labsDriveSyncMessages', () => {
  it('maps auth-required errors to reconnect copy', () => {
    expect(formatLabsDriveSyncError(new LabsGoogleInteractiveAuthRequiredError(), 'auto-pull')).toMatch(
      /sign in again/i,
    );
  });

  it('maps DriveHttpError to message', () => {
    expect(formatLabsDriveSyncError(new DriveHttpError('Quota exceeded', 403), 'push')).toBe('Quota exceeded');
  });

  it('detects sign-in messages for alert severity', () => {
    expect(labsDriveSyncMessageNeedsSignIn('Drive sync paused. Sign in again.')).toBe(true);
    expect(labsDriveSyncMessageIsFailure('Drive auto-pull failed.')).toBe(true);
    expect(labsDriveSyncMessageIsFailure('Drive sync paused. Sign in again.')).toBe(false);
  });

  it('exports shared idle labels', () => {
    expect(LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE).toMatch(/sync paused/i);
    expect(LABS_DRIVE_SIGN_IN_TO_SYNC_LABEL).toMatch(/sign in/i);
  });
});
