import { DriveHttpError, summarizeDriveApiErrorBody } from './driveFetchErrors';

/**
 * Turn a thrown Drive write error into something a person can act on.
 *
 * Every Encore upload path used to end in a bare `catch {}`. Quota exceeded, a revoked token, a
 * zero-byte file and "you are offline" all looked identical to success, because the local row saved
 * either way — so a demo take read as safe while living on exactly one device. Silence is the worst
 * possible answer here: the whole point of the Drive copy is that it survives losing the device.
 *
 * `formatDriveRequestFailure` already exists but produces operator text
 * ("Drive POST upload/resumable (init) (403): storageQuotaExceeded…"). That belongs in a log, not
 * under a take in the UI. This produces one plain sentence plus the two facts a caller needs:
 * whether retrying unaided could work, and whether the user has to do something first.
 */

export type DriveWriteFailureReason =
  /** Browser reports no connection. Retry when back online. */
  | 'offline'
  /** Token missing, expired or revoked. Needs sign-in before a retry can work. */
  | 'signed-out'
  /** Drive storage is full. Retrying changes nothing until space is freed. */
  | 'quota'
  /** Authenticated, but not allowed to write here. */
  | 'permission'
  /** Rate limit or a 5xx. Worth retrying as-is. */
  | 'transient'
  /** Nothing to upload. */
  | 'empty-file'
  | 'unknown';

export type DriveWriteFailure = {
  reason: DriveWriteFailureReason;
  /** One sentence: what happened, and what to do about it. */
  message: string;
  /** True when retrying without the user changing anything could plausibly succeed. */
  retryable: boolean;
  /** True when the user must act (sign in, free space) before a retry is worth offering. */
  needsUserAction: boolean;
  /** Operator detail for logs. Never rendered as the primary message. */
  detail?: string;
};

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Drive signals a full account with a 403 whose body names the storage quota. */
function isQuotaBody(body: string | undefined): boolean {
  return typeof body === 'string' && /storagequotaexceeded|quota.*exceed/i.test(body);
}

export function describeDriveWriteFailure(error: unknown): DriveWriteFailure {
  if (error instanceof DriveHttpError) {
    const detail = error.body ? summarizeDriveApiErrorBody(error.body) : undefined;

    if (error.status === 401) {
      return {
        reason: 'signed-out',
        message: 'Your Google sign-in expired, so this was not backed up. Sign in again to retry.',
        retryable: false,
        needsUserAction: true,
        detail,
      };
    }
    if (error.status === 403 && isQuotaBody(error.body)) {
      return {
        reason: 'quota',
        message: 'Your Google Drive is full, so this was not backed up. Free up space, then retry.',
        retryable: false,
        needsUserAction: true,
        detail,
      };
    }
    if (error.status === 403) {
      return {
        reason: 'permission',
        message:
          'Google would not let Encore save this file. Open Account and sign in again, then retry.',
        retryable: false,
        needsUserAction: true,
        detail,
      };
    }
    if (error.status === 400 && /empty|0 bytes/i.test(error.message)) {
      return {
        reason: 'empty-file',
        message: 'That file is empty (0 bytes), so there was nothing to back up.',
        retryable: false,
        needsUserAction: true,
        detail,
      };
    }
    if (error.status === 408 || error.status === 429 || error.status >= 500) {
      return {
        reason: 'transient',
        message: 'Google Drive was busy, so this was not backed up yet. Retry in a moment.',
        retryable: true,
        needsUserAction: false,
        detail,
      };
    }
    return {
      reason: 'unknown',
      message: 'This was not backed up to Drive. Retry, and check Account if it keeps failing.',
      retryable: true,
      needsUserAction: false,
      detail,
    };
  }

  // Not an HTTP error: almost always a network failure, which the upload path rethrows as-is.
  if (isOffline()) {
    return {
      reason: 'offline',
      message: "You're offline, so this was not backed up yet. It will retry when you reconnect.",
      retryable: true,
      needsUserAction: false,
    };
  }

  const detail = error instanceof Error ? error.message : undefined;
  if (detail && /failed to fetch|network|load failed|timeout/i.test(detail)) {
    return {
      reason: 'transient',
      message: 'The connection dropped, so this was not backed up yet. Retry in a moment.',
      retryable: true,
      needsUserAction: false,
      detail,
    };
  }

  return {
    reason: 'unknown',
    message: 'This was not backed up to Drive. Retry, and check Account if it keeps failing.',
    retryable: true,
    needsUserAction: false,
    detail,
  };
}
