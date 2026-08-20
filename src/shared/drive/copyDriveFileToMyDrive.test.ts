import { describe, expect, it } from 'vitest';
import { DriveHttpError } from './driveFetchErrors';
import {
  DriveCopyError,
  classifyDriveCopyFailure,
  isGoogleNativeMimeType,
} from './copyDriveFileToMyDrive';

/**
 * The classification is the load-bearing part: it decides whether the UI retries, tells the user to
 * ask for access, or gives up. Getting it wrong is what turned a shared link into an infinite
 * retry loop in the performance editor.
 */
describe('classifyDriveCopyFailure', () => {
  it('treats 403 as a permission problem, not a transient one', () => {
    expect(classifyDriveCopyFailure(new DriveHttpError('forbidden', 403))).toBe('no-access');
  });

  it('treats 404 as not-found', () => {
    // Drive returns 404 for a file that exists but was never shared with this user, so this is the
    // common case for "my friend sent me a link" — not a typo'd URL.
    expect(classifyDriveCopyFailure(new DriveHttpError('not found', 404))).toBe('not-found');
  });

  it('does not classify a transient status as permanent', () => {
    expect(classifyDriveCopyFailure(new DriveHttpError('rate limited', 429))).toBe('failed');
    expect(classifyDriveCopyFailure(new DriveHttpError('server', 500))).toBe('failed');
  });

  it('passes through a reason already decided by the copy itself', () => {
    expect(classifyDriveCopyFailure(new DriveCopyError('not-a-file', 'nope'))).toBe('not-a-file');
  });

  it('falls back to failed for anything unrecognised', () => {
    expect(classifyDriveCopyFailure(new TypeError('Failed to fetch'))).toBe('failed');
    expect(classifyDriveCopyFailure(undefined)).toBe('failed');
  });
});

describe('isGoogleNativeMimeType', () => {
  it('detects export-only Google types', () => {
    expect(isGoogleNativeMimeType('application/vnd.google-apps.document')).toBe(true);
    expect(isGoogleNativeMimeType('application/vnd.google-apps.spreadsheet')).toBe(true);
  });

  it('accepts real media', () => {
    expect(isGoogleNativeMimeType('video/mp4')).toBe(false);
    expect(isGoogleNativeMimeType('audio/mpeg')).toBe(false);
    expect(isGoogleNativeMimeType(undefined)).toBe(false);
  });

  it('does not mistake a Drive folder for a copyable file', () => {
    // Folders are also a google-apps type, so they are rejected by the same check.
    expect(isGoogleNativeMimeType('application/vnd.google-apps.folder')).toBe(true);
  });
});
