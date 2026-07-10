import { releaseWakeLock, requestWakeLock } from '../audio/wakeLock';
import {
  DriveHttpError,
  formatDriveRequestFailure,
  isTransientDriveHttpStatus,
} from './driveFetchErrors';

/** Drive requires non-final chunks to be multiples of 256 KiB. */
export const DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES = 256 * 1024;

/** ~5 MiB chunks — large enough to be efficient, small enough to survive tab suspend. */
export const DRIVE_RESUMABLE_CHUNK_BYTES = 20 * DRIVE_RESUMABLE_CHUNK_MULTIPLE_BYTES;

/** More attempts than before — each attempt waits for the tab to be visible after suspend. */
const CHUNK_RETRY_DELAYS_MS = [0, 500, 1500, 3000, 6000, 10000, 15000, 20000] as const;
const MAX_SESSION_RESTARTS = 3;
/** Abort a stalled chunk PUT so we can status-query + resume (ms per MiB, floored). */
const XHR_TIMEOUT_MS_PER_MIB = 45_000;
const XHR_TIMEOUT_MIN_MS = 60_000;
const XHR_TIMEOUT_MAX_MS = 10 * 60_000;

export type DriveUploadHttpResult = {
  status: number;
  body: string;
  getHeader: (name: string) => string | null;
};

export type DriveUploadProgress = {
  bytesSent: number;
  bytesTotal: number;
};

/** Wait until the document is visible (Chrome suspends network when the tab is hidden). */
export function waitForDocumentVisible(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', onChange);
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

export function xhrTimeoutMsForBytes(byteCount: number): number {
  const mib = Math.max(byteCount, 1) / (1024 * 1024);
  return Math.min(XHR_TIMEOUT_MAX_MS, Math.max(XHR_TIMEOUT_MIN_MS, Math.ceil(mib * XHR_TIMEOUT_MS_PER_MIB)));
}

/**
 * PUT via XHR — required because browser `fetch()` treats HTTP 308 as a redirect.
 * Drive's resumable protocol uses 308 Resume Incomplete (often with no Location), which
 * makes `fetch` fail the request even when the chunk was accepted.
 */
export function driveUploadXhrPut(opts: {
  url: string;
  headers: Record<string, string>;
  body?: Blob | null;
  timeoutMs?: number;
  onUploadProgress?: (loaded: number, total: number) => void;
}): Promise<DriveUploadHttpResult> {
  const { url, headers, body, timeoutMs, onUploadProgress } = opts;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (timeoutMs != null && timeoutMs > 0) {
      xhr.timeout = timeoutMs;
    }
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    if (onUploadProgress && body && body.size > 0) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onUploadProgress(ev.loaded, ev.total);
      };
    }
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        body: xhr.responseText ?? '',
        getHeader: (name) => xhr.getResponseHeader(name),
      });
    };
    xhr.onerror = () => {
      reject(new TypeError('Failed to fetch'));
    };
    xhr.ontimeout = () => {
      reject(new TypeError('Failed to fetch'));
    };
    xhr.onabort = () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    xhr.send(body ?? null);
  });
}

/** Parse `Range: bytes=0-N` from a 308 response; returns last received byte index, or -1 if none. */
export function parseDriveResumableRangeHeader(rangeHeader: string | null): number {
  if (!rangeHeader) return -1;
  const m = /bytes=\s*(\d+)\s*-\s*(\d+)/i.exec(rangeHeader.trim());
  if (!m) return -1;
  const end = Number.parseInt(m[2]!, 10);
  return Number.isFinite(end) ? end : -1;
}

/** Next byte offset to upload after a Range header (0 when nothing received yet). */
export function nextByteAfterDriveRange(rangeHeader: string | null): number {
  const last = parseDriveResumableRangeHeader(rangeHeader);
  return last < 0 ? 0 : last + 1;
}

export function isRetryableDriveUploadNetworkError(err: unknown): boolean {
  if (err instanceof DriveHttpError) {
    return isTransientDriveHttpStatus(err.status);
  }
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NetworkError')) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|load failed|aborted|io_suspended|offline|timeout/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** When offline, bubble up immediately so outer `driveUploadFileWithNetworkRetry` can show waiting UI. */
function throwIfBrowserOffline(lastError: unknown): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw lastError instanceof Error ? lastError : new TypeError('Failed to fetch');
  }
}

/** After a network failure: wait for the tab to be foreground, then a short backoff. */
async function waitBeforeUploadRetry(delayMs: number): Promise<void> {
  await waitForDocumentVisible();
  if (delayMs > 0) await sleep(delayMs);
}

async function putChunk(opts: {
  sessionUri: string;
  chunk: Blob;
  start: number;
  endInclusive: number;
  total: number;
  mimeType: string;
  put?: typeof driveUploadXhrPut;
  onChunkByteProgress?: (loadedInChunk: number) => void;
}): Promise<DriveUploadHttpResult> {
  const {
    sessionUri,
    chunk,
    start,
    endInclusive,
    total,
    mimeType,
    put = driveUploadXhrPut,
    onChunkByteProgress,
  } = opts;
  return put({
    url: sessionUri,
    headers: {
      'Content-Type': mimeType,
      'Content-Range': `bytes ${start}-${endInclusive}/${total}`,
    },
    body: chunk,
    timeoutMs: xhrTimeoutMsForBytes(chunk.size),
    onUploadProgress: onChunkByteProgress
      ? (loaded) => {
          onChunkByteProgress(loaded);
        }
      : undefined,
  });
}

/** Empty PUT to learn how many bytes Drive already has for this session. */
export async function queryDriveResumableUploadStatus(
  sessionUri: string,
  totalBytes: number,
  put: typeof driveUploadXhrPut = driveUploadXhrPut,
): Promise<{ nextByte: number; completed: boolean; body?: string }> {
  const res = await put({
    url: sessionUri,
    headers: {
      'Content-Range': `bytes */${totalBytes}`,
    },
    body: null,
    timeoutMs: 60_000,
  });
  const text = res.body;
  if (res.status === 200 || res.status === 201) {
    return { nextByte: totalBytes, completed: true, body: text };
  }
  if (res.status === 308) {
    return { nextByte: nextByteAfterDriveRange(res.getHeader('Range')), completed: false };
  }
  if (res.status === 404 || res.status === 410) {
    throw new DriveHttpError(
      formatDriveRequestFailure('PUT', 'upload/resumable (status)', res.status, text),
      res.status,
      text,
    );
  }
  throw new DriveHttpError(
    formatDriveRequestFailure('PUT', 'upload/resumable (status)', res.status, text),
    res.status,
    text,
  );
}

/**
 * After a successful chunk PUT that returned 308: prefer Drive's Range cursor.
 * If Range is missing (CORS), assume the chunk we just sent was accepted — otherwise
 * multi-chunk browser uploads stall forever on the first chunk.
 */
export function resolveOffsetAfterChunk308(opts: {
  rangeHeader: string | null;
  chunkStart: number;
  chunkEndExclusive: number;
}): number {
  const fromRange = nextByteAfterDriveRange(opts.rangeHeader);
  if (fromRange > opts.chunkStart) return fromRange;
  return opts.chunkEndExclusive;
}

async function uploadChunksFromOffset(opts: {
  sessionUri: string;
  file: Blob;
  mimeType: string;
  startByte: number;
  chunkBytes: number;
  put?: typeof driveUploadXhrPut;
  onProgress?: (progress: DriveUploadProgress) => void;
}): Promise<string> {
  const { sessionUri, file, mimeType, chunkBytes, put = driveUploadXhrPut, onProgress } = opts;
  const total = file.size;
  let offset = opts.startByte;
  const report = (bytesSent: number) => {
    onProgress?.({ bytesSent: Math.min(bytesSent, total), bytesTotal: total });
  };
  report(offset);

  while (offset < total) {
    const endExclusive = Math.min(offset + chunkBytes, total);
    const endInclusive = endExclusive - 1;
    const chunk = file.slice(offset, endExclusive);
    const chunkStart = offset;

    let lastError: unknown = null;
    let advanced = false;

    for (let attempt = 0; attempt < CHUNK_RETRY_DELAYS_MS.length; attempt += 1) {
      if (attempt > 0) {
        throwIfBrowserOffline(lastError);
        await waitBeforeUploadRetry(CHUNK_RETRY_DELAYS_MS[attempt]!);
      }
      try {
        const res = await putChunk({
          sessionUri,
          chunk,
          start: offset,
          endInclusive,
          total,
          mimeType,
          put,
          onChunkByteProgress: (loaded) => {
            report(chunkStart + loaded);
          },
        });
        const text = res.body;

        if (res.status === 200 || res.status === 201) {
          report(total);
          return text;
        }
        if (res.status === 308) {
          offset = resolveOffsetAfterChunk308({
            rangeHeader: res.getHeader('Range'),
            chunkStart,
            chunkEndExclusive: endExclusive,
          });
          report(offset);
          advanced = true;
          break;
        }
        if (res.status === 404 || res.status === 410) {
          throw new DriveHttpError(
            formatDriveRequestFailure('PUT', 'upload/resumable', res.status, text),
            res.status,
            text,
          );
        }
        if (isTransientDriveHttpStatus(res.status)) {
          lastError = new DriveHttpError(
            formatDriveRequestFailure('PUT', 'upload/resumable', res.status, text),
            res.status,
            text,
          );
          continue;
        }
        throw new DriveHttpError(
          formatDriveRequestFailure('PUT', 'upload/resumable', res.status, text),
          res.status,
          text,
        );
      } catch (err) {
        lastError = err;
        if (err instanceof DriveHttpError && (err.status === 404 || err.status === 410)) {
          throw err;
        }
        if (!isRetryableDriveUploadNetworkError(err)) throw err;

        throwIfBrowserOffline(err);

        await waitForDocumentVisible();

        // After network blip / suspend: ask Drive how far we got, then resume.
        try {
          const status = await queryDriveResumableUploadStatus(sessionUri, total, put);
          if (status.completed && status.body != null) {
            report(total);
            return status.body;
          }
          if (status.nextByte > offset) {
            offset = status.nextByte;
            report(offset);
            advanced = true;
            break;
          }
        } catch (statusErr) {
          if (statusErr instanceof DriveHttpError && (statusErr.status === 404 || statusErr.status === 410)) {
            throw statusErr;
          }
          lastError = statusErr;
        }
      }
    }

    if (!advanced) {
      throw lastError instanceof Error
        ? lastError
        : new DriveHttpError('Drive resumable upload failed after retries.', 0);
    }
  }

  const status = await queryDriveResumableUploadStatus(sessionUri, total, put);
  if (status.completed && status.body != null) {
    report(total);
    return status.body;
  }
  throw new DriveHttpError(
    'Drive resumable upload finished sending bytes but did not return a file id.',
    0,
  );
}

export type DriveResumableUploadInit = {
  accessToken: string;
  file: Blob;
  parents: string[];
  fileName: string;
  mimeType: string;
  chunkBytes?: number;
  onProgress?: (progress: DriveUploadProgress) => void;
  /** Injected for tests. */
  fetchInitSession?: (args: {
    accessToken: string;
    fileName: string;
    parents: string[];
    mimeType: string;
    size: number;
  }) => Promise<string>;
  /** Injected for tests — production uses XHR so 308 is readable. */
  put?: typeof driveUploadXhrPut;
};

async function defaultInitSession(args: {
  accessToken: string;
  fileName: string;
  parents: string[];
  mimeType: string;
  size: number;
}): Promise<string> {
  const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
  let lastError: unknown = null;
  for (let attempt = 0; attempt < CHUNK_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      throwIfBrowserOffline(lastError);
      await waitBeforeUploadRetry(CHUNK_RETRY_DELAYS_MS[attempt]!);
    }
    try {
      const init = await fetch(`${UPLOAD_BASE}/files?uploadType=resumable&fields=id&supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': args.mimeType,
          'X-Upload-Content-Length': String(args.size),
        },
        body: JSON.stringify({ name: args.fileName, parents: args.parents }),
      });
      const initText = await init.text();
      if (!init.ok) {
        const err = new DriveHttpError(
          formatDriveRequestFailure('POST', 'upload/resumable (init)', init.status, initText),
          init.status,
          initText,
        );
        if (isTransientDriveHttpStatus(init.status)) {
          lastError = err;
          continue;
        }
        throw err;
      }
      const location = init.headers.get('Location');
      if (!location) {
        throw new DriveHttpError(
          formatDriveRequestFailure('POST', 'upload/resumable (no Location)', init.status, initText),
          init.status,
          initText,
        );
      }
      return location;
    } catch (err) {
      lastError = err;
      if (err instanceof DriveHttpError && !isTransientDriveHttpStatus(err.status)) throw err;
      if (!isRetryableDriveUploadNetworkError(err) && !(err instanceof DriveHttpError)) throw err;
      throwIfBrowserOffline(err);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new DriveHttpError('Drive resumable upload init failed after retries.', 0);
}

/**
 * Chunked Drive resumable upload with status-query resume after network suspend / transient errors.
 * Session URI expiry (404/410) restarts the upload from byte 0 a limited number of times.
 *
 * Chunk PUTs use XHR (not fetch): browser fetch treats Drive's 308 Resume Incomplete as a redirect
 * and fails multi-chunk uploads even when Drive accepted the bytes.
 */
export async function uploadDriveFileResumableChunked(opts: DriveResumableUploadInit): Promise<{ id: string }> {
  const {
    accessToken,
    file,
    parents,
    fileName,
    mimeType,
    chunkBytes = DRIVE_RESUMABLE_CHUNK_BYTES,
    onProgress,
    fetchInitSession = defaultInitSession,
    put = driveUploadXhrPut,
  } = opts;

  if (file.size <= 0) {
    throw new DriveHttpError('Cannot upload an empty file (0 bytes).', 400);
  }

  await requestWakeLock();
  try {
    let lastError: unknown = null;
    for (let restart = 0; restart <= MAX_SESSION_RESTARTS; restart += 1) {
      try {
        await waitForDocumentVisible();
        const sessionUri = await fetchInitSession({
          accessToken,
          fileName,
          parents,
          mimeType,
          size: file.size,
        });
        const putText = await uploadChunksFromOffset({
          sessionUri,
          file,
          mimeType,
          startByte: 0,
          chunkBytes,
          put,
          onProgress,
        });
        try {
          return JSON.parse(putText) as { id: string };
        } catch {
          throw new DriveHttpError(
            formatDriveRequestFailure('PUT', 'upload/resumable (parse)', 200, putText),
            200,
            putText,
          );
        }
      } catch (err) {
        lastError = err;
        const expired =
          err instanceof DriveHttpError && (err.status === 404 || err.status === 410);
        if (!expired || restart === MAX_SESSION_RESTARTS) throw err;
        await waitBeforeUploadRetry(1000);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new DriveHttpError('Drive resumable upload failed.', 0);
  } finally {
    await releaseWakeLock();
  }
}
