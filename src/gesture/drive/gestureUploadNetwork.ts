import { DriveHttpError } from '../../shared/drive/driveFetch';

const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const ONLINE_QUICK_RETRY_DELAYS_MS = [400, 900, 1800] as const;
/** Per-file ceiling while waiting for connectivity during an active upload session. */
export const GESTURE_UPLOAD_NETWORK_WAIT_MAX_MS = 15 * 60 * 1000;

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Network blips, rate limits, and Drive 5xx — safe to retry the same file upload. */
export function isTransientUploadError(error: unknown): boolean {
  if (error instanceof DriveHttpError) {
    return TRANSIENT_HTTP_STATUSES.has(error.status);
  }
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until `navigator.onLine` is true or the deadline passes.
 * Calls `onTick` on each offline poll so callers can cooperatively cancel.
 */
export async function waitForNetworkOnline(
  options?: {
    maxWaitMs?: number;
    onTick?: () => void | Promise<void>;
  },
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (navigator.onLine) return true;

  const maxWaitMs = options?.maxWaitMs ?? GESTURE_UPLOAD_NETWORK_WAIT_MAX_MS;
  const start = Date.now();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('online', onOnline);
      window.clearInterval(pollId);
      resolve(ok);
    };

    const onOnline = () => finish(true);
    const pollId = window.setInterval(() => {
      void options?.onTick?.();
      if (navigator.onLine) {
        finish(true);
        return;
      }
      if (Date.now() - start >= maxWaitMs) finish(false);
    }, 1000);

    window.addEventListener('online', onOnline);
  });
}

export async function driveUploadFileWithNetworkRetry(
  upload: () => Promise<{ id: string }>,
  options?: {
    isCancelled?: () => void | Promise<void>;
    onWaiting?: () => void;
    maxWaitMs?: number;
  },
): Promise<{ id: string }> {
  let quickAttempt = 0;

  while (true) {
    await options?.isCancelled?.();

    try {
      return await upload();
    } catch (error) {
      if (!isTransientUploadError(error)) throw error;

      if (!isBrowserOffline() && quickAttempt < ONLINE_QUICK_RETRY_DELAYS_MS.length) {
        await sleep(ONLINE_QUICK_RETRY_DELAYS_MS[quickAttempt]!);
        quickAttempt += 1;
        continue;
      }

      options?.onWaiting?.();
      const backOnline = await waitForNetworkOnline({
        maxWaitMs: options?.maxWaitMs ?? GESTURE_UPLOAD_NETWORK_WAIT_MAX_MS,
        onTick: options?.isCancelled,
      });
      if (!backOnline) throw error;
      quickAttempt = 0;
    }
  }
}
