import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import {
  driveUploadFileWithNetworkRetry,
  isBrowserOffline,
  isTransientUploadError,
  waitForNetworkOnline,
} from './gestureUploadNetwork';

describe('gestureUploadNetwork', () => {
  describe('isTransientUploadError', () => {
    it('treats Drive 5xx and rate limits as transient', () => {
      expect(isTransientUploadError(new DriveHttpError('slow', 503))).toBe(true);
      expect(isTransientUploadError(new DriveHttpError('rate', 429))).toBe(true);
    });

    it('treats fetch failures as transient', () => {
      expect(isTransientUploadError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('does not treat auth errors as transient', () => {
      expect(isTransientUploadError(new DriveHttpError('denied', 403))).toBe(false);
    });
  });

  describe('driveUploadFileWithNetworkRetry', () => {
    it('retries after a transient failure when online', async () => {
      const upload = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({ id: 'file-1' });

      const result = await driveUploadFileWithNetworkRetry(upload);
      expect(result.id).toBe('file-1');
      expect(upload).toHaveBeenCalledTimes(2);
    });
  });

  describe('waitForNetworkOnline', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', { onLine: false });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('resolves true when the browser comes back online', async () => {
      const promise = waitForNetworkOnline({ maxWaitMs: 5000 });
      vi.stubGlobal('navigator', { onLine: true });
      window.dispatchEvent(new Event('online'));
      await expect(promise).resolves.toBe(true);
    });

    it('returns false when still offline after the deadline', async () => {
      await expect(waitForNetworkOnline({ maxWaitMs: 50 })).resolves.toBe(false);
    });
  });

  describe('isBrowserOffline', () => {
    it('reflects navigator.onLine', () => {
      vi.stubGlobal('navigator', { onLine: false });
      expect(isBrowserOffline()).toBe(true);
      vi.unstubAllGlobals();
    });
  });
});
