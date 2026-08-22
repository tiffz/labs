// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DriveHttpError } from './driveFetchErrors';
import { describeDriveWriteFailure } from './describeDriveWriteFailure';

function setOnline(online: boolean): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The classification decides what the UI offers. Getting `retryable` wrong is not cosmetic: a
 * pointless retry button on a full Drive teaches the user the button does not work, and a missing
 * one on a dropped connection loses the take's backup for good.
 */
describe('describeDriveWriteFailure', () => {
  it('names a full Drive rather than offering a useless retry', () => {
    const full = new DriveHttpError('upload failed', 403, '{"error":{"message":"storageQuotaExceeded"}}');
    const result = describeDriveWriteFailure(full);
    expect(result.reason).toBe('quota');
    expect(result.retryable).toBe(false);
    expect(result.needsUserAction).toBe(true);
    expect(result.message).toMatch(/full/i);
  });

  it('separates an expired sign-in from a permission refusal', () => {
    expect(describeDriveWriteFailure(new DriveHttpError('unauthorized', 401)).reason).toBe(
      'signed-out'
    );
    expect(describeDriveWriteFailure(new DriveHttpError('forbidden', 403)).reason).toBe(
      'permission'
    );
  });

  it('does not confuse a plain 403 with a quota 403', () => {
    // Both are 403; only the body distinguishes them, and the advice differs completely.
    const plain = describeDriveWriteFailure(new DriveHttpError('forbidden', 403, 'not allowed'));
    expect(plain.reason).toBe('permission');
    expect(plain.message).not.toMatch(/full/i);
  });

  it('treats rate limits and 5xx as worth retrying unaided', () => {
    for (const status of [429, 500, 503]) {
      const r = describeDriveWriteFailure(new DriveHttpError('busy', status));
      expect(r.reason, `status ${status}`).toBe('transient');
      expect(r.retryable, `status ${status}`).toBe(true);
      expect(r.needsUserAction, `status ${status}`).toBe(false);
    }
  });

  it('recognises being offline', () => {
    setOnline(false);
    const r = describeDriveWriteFailure(new TypeError('Failed to fetch'));
    expect(r.reason).toBe('offline');
    expect(r.retryable).toBe(true);
    expect(r.needsUserAction).toBe(false);
  });

  it('calls a dropped connection transient rather than offline when the browser is online', () => {
    setOnline(true);
    expect(describeDriveWriteFailure(new TypeError('Failed to fetch')).reason).toBe('transient');
  });

  it('always produces a message, even for something unrecognised', () => {
    setOnline(true);
    const r = describeDriveWriteFailure({ weird: true });
    expect(r.message.length).toBeGreaterThan(0);
    expect(r.reason).toBe('unknown');
  });

  it('never puts operator text in the user-facing message', () => {
    setOnline(true);
    const raw = new DriveHttpError(
      'Drive POST upload/resumable (init) (403)',
      403,
      '{"error":{"message":"storageQuotaExceeded"}}'
    );
    const r = describeDriveWriteFailure(raw);
    expect(r.message).not.toMatch(/POST|resumable|403/);
    // ...but the detail is still there for logs.
    expect(r.detail).toMatch(/storageQuotaExceeded/);
  });
});
