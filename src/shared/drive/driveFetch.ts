import { inferMediaMimeType } from './inferMediaMimeType';
import {
  DriveHttpError,
  formatDriveRequestFailure,
  isTransientDriveHttpStatus,
} from './driveFetchErrors';
import {
  DRIVE_MAX_RETRY_ATTEMPTS,
  computeDriveRetryBackoffMs,
  computeDriveRetryWaitMs,
  runWithDriveConcurrencyLimit,
} from './driveRequestGovernor';
import { uploadDriveFileResumableChunked } from './driveResumableUpload';
import { tryRefreshGoogleAccessTokenViaBff } from '../session/labsGoogleSessionPort';

export {
  DriveHttpError,
  formatDriveRequestFailure,
  summarizeDriveApiErrorBody,
} from './driveFetchErrors';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

function driveRetrySleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A thrown `fetch` error is retryable unless the browser knows it is offline (fail fast then). */
function isRetryableDriveNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NetworkError')) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|load failed|timeout/i.test(msg);
}

/**
 * Authorized Drive fetch, the single choke point every Labs app's Drive I/O flows through.
 *
 * - **One 401 → BFF cookie refresh → retry.** Access tokens expire mid-session (1h TTL); when the
 *   BFF holds a live session this converts what used to surface as "sign in again" into a silent
 *   recovery. Never opens GIS (ADR 0010/0011) — a second 401 falls through to the caller's error path.
 * - **Bounded global concurrency + jittered, `Retry-After`-honoring retries** (Drive red-team rec #3,
 *   see `driveRequestGovernor.ts`): caps in-flight requests so a fan-out cannot burst, and retries
 *   429/5xx/network with full jitter so retries never arrive as a synchronized wave.
 *
 * 2xx and non-retryable errors (400/403/404/412/…) are returned to the caller unchanged.
 */
async function driveFetch(
  accessToken: string,
  url: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<Response> {
  return runWithDriveConcurrencyLimit(async () => {
    const doFetch = (token: string) =>
      fetch(url, {
        ...init,
        headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
      });

    let token = accessToken;
    let refreshedOnce = false;
    let retries = 0;
    for (;;) {
      let res: Response;
      try {
        res = await doFetch(token);
      } catch (err) {
        if (retries < DRIVE_MAX_RETRY_ATTEMPTS && isRetryableDriveNetworkError(err)) {
          retries += 1;
          await driveRetrySleep(computeDriveRetryBackoffMs(retries));
          continue;
        }
        throw err;
      }

      if (res.status === 401 && !refreshedOnce) {
        refreshedOnce = true;
        const refreshed = await tryRefreshGoogleAccessTokenViaBff();
        if (!refreshed || refreshed === token) return res;
        token = refreshed;
        continue; // token refresh does not consume the transient-retry budget
      }

      if (retries < DRIVE_MAX_RETRY_ATTEMPTS && isTransientDriveHttpStatus(res.status)) {
        retries += 1;
        const waitMs = computeDriveRetryWaitMs(res.headers.get('Retry-After'), retries, Date.now());
        // Drain the discarded body so the socket can be reused before we back off.
        await res.text().catch(() => undefined);
        await driveRetrySleep(waitMs);
        continue;
      }

      return res;
    }
  });
}

/** Drive v3 rejects `etag` in `fields` masks; use the HTTP `ETag` response header for concurrency (`If-Match`). */
export function etagFromDriveResponse(res: Response): string | undefined {
  return res.headers.get('ETag')?.trim() || undefined;
}

export async function driveGetJson<T>(
  accessToken: string,
  path: string,
  query?: Record<string, string>
): Promise<T> {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const res = await driveFetch(accessToken, `${DRIVE_BASE}${path}${qs}`);
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('GET', path, res.status, text), res.status, text);
  }
  return JSON.parse(text) as T;
}

export async function driveGetMedia(accessToken: string, fileId: string): Promise<string> {
  const res = await driveFetch(accessToken, `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`);
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('GET', `files/…/alt=media`, res.status, text), res.status, text);
  }
  return text;
}

/** One stored revision of a Drive file (`revisions.list`). Drive keeps prior revisions of uploaded files. */
export type DriveRevisionRow = {
  id?: string;
  modifiedTime?: string;
  /** When true, the revision is pinned and not subject to Drive's automatic pruning. */
  keepForever?: boolean;
  size?: string;
};

/**
 * List a file's revision history (oldest → newest as Drive returns them). Used by data-loss
 * recovery: an accidental empty overwrite can be undone by reading an older revision of the
 * synced JSON. Note Drive auto-prunes unpinned revisions of non-Google files (≈100 revisions or
 * 30 days), so recovery is time-sensitive.
 */
export async function driveListRevisions(
  accessToken: string,
  fileId: string,
): Promise<DriveRevisionRow[]> {
  const rows: DriveRevisionRow[] = [];
  let pageToken: string | undefined;
  do {
    const query: Record<string, string> = {
      fields: 'nextPageToken,revisions(id,modifiedTime,keepForever,size)',
      pageSize: '1000',
    };
    if (pageToken) query.pageToken = pageToken;
    const res = await driveGetJson<{ revisions?: DriveRevisionRow[]; nextPageToken?: string }>(
      accessToken,
      `/files/${encodeURIComponent(fileId)}/revisions`,
      query,
    );
    rows.push(...(res.revisions ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return rows;
}

/** Read the text body of a specific file revision (`revisions.get?alt=media`). */
export async function driveGetRevisionMedia(
  accessToken: string,
  fileId: string,
  revisionId: string,
): Promise<string> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}?alt=media`,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(
      formatDriveRequestFailure('GET', `files/…/revisions/…/alt=media`, res.status, text),
      res.status,
      text,
    );
  }
  return text;
}

/** Binary `alt=media` read (audio/video/pdf bytes). Prefer over {@link driveGetMedia} for non-text bodies. */
export async function driveGetMediaArrayBuffer(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError(formatDriveRequestFailure('GET', `files/…/alt=media`, res.status, text), res.status, text);
  }
  return res.arrayBuffer();
}

export type DriveFileListRow = {
  id?: string;
  name?: string;
  mimeType?: string;
  /** When the file was first created in Drive (often first upload). Prefer over {@link modifiedTime} for “when did this file land here?”. */
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  /** User or app description; sometimes richer than the file name (not the same as Drive UI “AI summary”). */
  description?: string;
  /** Drive may expose short indexable text for search; optional and often empty for videos. */
  contentHints?: { indexableText?: string };
  /** Byte size as a decimal string (Drive `files.list` / `files.get`). */
  size?: string;
  /** MD5 for uploaded binary files; absent for Google Docs and some native types. */
  md5Checksum?: string;
  /** When true, the file or folder is in the user's Drive trash. */
  trashed?: boolean;
  /** Populated for `application/vnd.google-apps.shortcut` rows from `files.list`. */
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
  /** Shared drive id when the row lives on a shared drive. */
  driveId?: string;
};

/**
 * Pick one Drive file id from a list: keep {@link preferredId} when it still appears (stable guest URLs),
 * otherwise the most recently modified row. Empty / missing ids are skipped.
 */
export function pickPreferredDriveListFileId(
  files: DriveFileListRow[] | undefined,
  preferredId: string | undefined,
): string | undefined {
  const list = (files ?? []).filter((f): f is DriveFileListRow & { id: string } => Boolean(f.id?.trim()));
  const pref = preferredId?.trim();
  if (pref && list.some((f) => f.id === pref)) return pref;
  if (list.length === 0) return undefined;
  const sorted = [...list].sort((a, b) => {
    const ta = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
    const tb = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
    if (tb !== ta) return tb - ta;
    return a.id.localeCompare(b.id);
  });
  return sorted[0]?.id;
}

export async function driveListFiles(
  accessToken: string,
  q: string,
  /** Drive returns 400 "Invalid field selection etag" if `etag` is included here; use `files.get` for etags. */
  fields = 'nextPageToken,files(id,name,mimeType,parents,modifiedTime)',
  pageSize = 24,
  pageToken?: string,
  /** When set, list within this shared drive (more reliable than `allDrives` for drive-owned trees). */
  driveId?: string,
): Promise<{ files?: DriveFileListRow[]; nextPageToken?: string }> {
  // Drive v3 rejects some field masks when comma is followed by a space (`nextPageToken, files(...)` → HTTP 400).
  const fieldsParam = fields
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
  const scopedDriveId = driveId?.trim();
  const query: Record<string, string> = {
    q,
    fields: fieldsParam,
    spaces: 'drive',
    /**
     * My Drive + shared drives: without these, `files.list` can 403/empty-list for folders on
     * shared drives or certain `in parents` queries (breaks in-app Drive browse).
     */
    corpora: scopedDriveId ? 'drive' : 'allDrives',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    pageSize: String(pageSize),
  };
  if (scopedDriveId) query.driveId = scopedDriveId;
  if (pageToken) query.pageToken = pageToken;
  return driveGetJson(accessToken, '/files', query);
}

/**
 * Resumable Drive upload in 256 KiB–aligned chunks with status-query resume after
 * network suspend / transient failures (replaces the old single full-file PUT).
 */
export async function driveUploadFileResumable(
  accessToken: string,
  file: File,
  parents: string[],
  name?: string,
  options?: { onProgress?: (progress: { bytesSent: number; bytesTotal: number }) => void },
): Promise<{ id: string }> {
  const fileName = name?.trim() || file.name || 'upload';
  return uploadDriveFileResumableChunked({
    accessToken,
    file,
    parents,
    fileName,
    mimeType: inferMediaMimeType(file),
    onProgress: options?.onProgress,
  });
}

export async function driveCreateJsonFile(
  accessToken: string,
  body: string,
  name: string,
  parents: string[]
): Promise<{ id: string; mimeType?: string; etag?: string; modifiedTime?: string }> {
  const boundary = 'encore_boundary';
  const metadata = JSON.stringify({ name, parents, mimeType: 'application/json' });
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    body,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  // Same as `files.list`: `etag` is not a valid `fields` selection for multipart create (400 Invalid field selection).
  const res = await driveFetch(accessToken, `${UPLOAD_BASE}/files?uploadType=multipart&fields=id,mimeType,modifiedTime`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('POST', 'upload/multipart', res.status, text), res.status, text);
  }
  const parsed = JSON.parse(text) as { id: string; mimeType?: string; modifiedTime?: string };
  return { ...parsed, etag: etagFromDriveResponse(res) };
}

export async function drivePatchJsonMedia(
  accessToken: string,
  fileId: string,
  body: string,
  ifMatch: string | undefined
): Promise<{ id: string; etag?: string; modifiedTime?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (ifMatch) headers['If-Match'] = ifMatch;

  const res = await driveFetch(
    accessToken,
    `${UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime&supportsAllDrives=true`,
    { method: 'PATCH', headers, body }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('PATCH', `files/${fileId}/media`, res.status, text), res.status, text);
  }
  const parsed = JSON.parse(text) as { id: string; modifiedTime?: string };
  return { ...parsed, etag: etagFromDriveResponse(res) };
}

export async function driveCreateFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<{ id: string }> {
  const res = await driveFetch(accessToken, `${DRIVE_BASE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('POST', 'files (create folder)', res.status, text), res.status, text);
  }
  return JSON.parse(text) as { id: string };
}

export async function driveCreateShortcut(
  accessToken: string,
  name: string,
  parentId: string,
  targetFileId: string
): Promise<{ id: string }> {
  const res = await driveFetch(accessToken, `${DRIVE_BASE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.shortcut',
      parents: [parentId],
      shortcutDetails: { targetId: targetFileId },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('POST', 'files (shortcut)', res.status, text), res.status, text);
  }
  return JSON.parse(text) as { id: string };
}

export async function driveCreateAnyoneReaderPermission(
  accessToken: string,
  fileId: string
): Promise<void> {
  const url = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions`;
  // Transient (429/5xx) retries with jitter + Retry-After live in driveFetch now.
  const res = await driveFetch(accessToken, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });
  if (res.ok) return;
  const text = await res.text();
  throw new DriveHttpError(formatDriveRequestFailure('POST', 'files/permissions', res.status, text), res.status, text);
}

export type DriveFileContentFingerprint = {
  id: string;
  /** Resolved media file (shortcut targets followed). */
  mediaFileId: string;
  name: string;
  mimeType?: string;
  size?: string;
  md5Checksum?: string;
  createdTime?: string;
  isShortcutRow: boolean;
};

export async function driveGetFileMetadata(
  accessToken: string,
  fileId: string,
  fields = 'id,createdTime,modifiedTime,mimeType,name,parents,shortcutDetails',
): Promise<{
  id: string;
  /** When the file was created in Drive (first upload / insert). Prefer for “performance happened near”. */
  createdTime?: string;
  modifiedTime?: string;
  etag?: string;
  mimeType?: string;
  name?: string;
  parents?: string[];
  size?: string;
  md5Checksum?: string;
  /** Populated for `application/vnd.google-apps.shortcut` files. */
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
  /** Shared drive id when the file lives on a shared drive. */
  driveId?: string;
  /** When true, the file or folder is in the user's Drive trash. */
  trashed?: boolean;
}> {
  const path = `/files/${encodeURIComponent(fileId)}`;
  const qs = `?${new URLSearchParams({
    fields,
    supportsAllDrives: 'true',
  }).toString()}`;
  // driveFetch governs transient (429/5xx) retries with jitter + Retry-After.
  const res = await driveFetch(accessToken, `${DRIVE_BASE}${path}${qs}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new DriveHttpError(formatDriveRequestFailure('GET', path, res.status, errText), res.status, errText);
  }
  const text = await res.text();
  const data = JSON.parse(text) as {
    id: string;
    createdTime?: string;
    modifiedTime?: string;
    mimeType?: string;
    name?: string;
    parents?: string[];
    size?: string;
    md5Checksum?: string;
    shortcutDetails?: { targetId?: string; targetMimeType?: string };
    trashed?: boolean;
  };
  return { ...data, etag: etagFromDriveResponse(res) };
}

/** Content fingerprint for duplicate-upload detection (follows shortcuts to the media file). */
export async function driveGetFileContentFingerprint(
  accessToken: string,
  fileId: string,
): Promise<DriveFileContentFingerprint> {
  const { mediaFileId, meta } = await driveResolveFileForMedia(accessToken, fileId);
  const media = await driveGetFileMetadata(
    accessToken,
    mediaFileId,
    'id,createdTime,mimeType,name,size,md5Checksum',
  );
  return {
    id: fileId.trim(),
    mediaFileId,
    name: media.name ?? meta.name ?? 'Untitled',
    mimeType: media.mimeType ?? meta.mimeType,
    size: media.size,
    md5Checksum: media.md5Checksum,
    createdTime: media.createdTime ?? meta.createdTime,
    isShortcutRow: meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME,
  };
}

/** Google Drive shortcut row; follow `shortcutDetails.targetId` before `alt=media`. */
export const GOOGLE_DRIVE_SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

/**
 * Walks shortcut rows to the file Drive will serve for `alt=media` (target id).
 * Rejects unresolved shortcuts or chains longer than `maxDepth`.
 */
export async function driveResolveFileForMedia(
  accessToken: string,
  fileId: string,
  maxDepth = 6,
): Promise<{
  mediaFileId: string;
  meta: Awaited<ReturnType<typeof driveGetFileMetadata>>;
}> {
  let id = fileId.trim();
  let meta = await driveGetFileMetadata(accessToken, id);
  let depth = 0;
  while (meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME && depth < maxDepth) {
    const next = meta.shortcutDetails?.targetId?.trim();
    if (!next) {
      throw new DriveHttpError('This Drive shortcut has no resolvable target file.', 400);
    }
    depth += 1;
    id = next;
    meta = await driveGetFileMetadata(accessToken, id);
  }
  if (meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME) {
    throw new DriveHttpError('This Drive shortcut chain is too long or is still a shortcut after resolution.', 400);
  }
  return { mediaFileId: id, meta };
}

const SHORTCUT_MIME = GOOGLE_DRIVE_SHORTCUT_MIME;

/**
 * OAuth-backed thumbnail URL for a Drive file (or shortcut → target). Returns null when
 * Drive does not expose `thumbnailLink`, on permission errors, or after transient retries fail.
 */
export async function driveResolveThumbnailLink(accessToken: string, fileId: string, depth = 0): Promise<string | null> {
  if (depth > 4) return null;
  const path = `/files/${encodeURIComponent(fileId)}`;
  const qs = `?${new URLSearchParams({
    fields: 'mimeType,thumbnailLink,shortcutDetails',
    supportsAllDrives: 'true',
  }).toString()}`;
  // driveFetch governs transient (429/5xx) retries with jitter + Retry-After; a persistent
  // failure returns a non-ok response here, which we treat as "no thumbnail" (null).
  const res = await driveFetch(accessToken, `${DRIVE_BASE}${path}${qs}`);
  if (!res.ok) {
    await res.text().catch(() => undefined);
    return null;
  }
  const text = await res.text();
  try {
    const data = JSON.parse(text) as {
      mimeType?: string;
      thumbnailLink?: string;
      shortcutDetails?: { targetId?: string };
    };
    if (data.mimeType === SHORTCUT_MIME && data.shortcutDetails?.targetId?.trim()) {
      return driveResolveThumbnailLink(accessToken, data.shortcutDetails.targetId.trim(), depth + 1);
    }
    return data.thumbnailLink?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Trash a Drive file (reversible from the Drive UI for ~30 days). The sharded sync uses this for
 * per-row deletes so a stray double-click in the UI does not vaporize the user's only copy.
 */
export async function driveTrashFile(accessToken: string, fileId: string): Promise<void> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trashed: true }),
    },
  );
  if (res.ok) return;
  const text = await res.text();
  // 404 means the shard is already gone; treat as success so retry storms drain.
  if (res.status === 404) return;
  throw new DriveHttpError(formatDriveRequestFailure('PATCH', 'files (trash)', res.status, text), res.status, text);
}

/** Rename a file (does not move parents). */
export async function driveRenameFile(
  accessToken: string,
  fileId: string,
  newName: string,
): Promise<void> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError(formatDriveRequestFailure('PATCH', 'files (rename)', res.status, text), res.status, text);
  }
}

/** Update a file or folder description (visible in Drive UI). */
export async function drivePatchFileDescription(
  accessToken: string,
  fileId: string,
  description: string,
): Promise<void> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: description.trim() || '' }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError(
      formatDriveRequestFailure('PATCH', 'files (description)', res.status, text),
      res.status,
      text,
    );
  }
}

/**
 * Move a file so it is filed under `newParentId`. Removes prior parent folder ids except any that
 * already match `newParentId`. Uses Drive `addParents` / `removeParents` (v3).
 */
export async function driveMoveFile(
  accessToken: string,
  fileId: string,
  newParentId: string,
  previousParentIds: string[],
): Promise<void> {
  const toRemove = previousParentIds.filter((p) => p !== newParentId);
  if (previousParentIds.length === 1 && previousParentIds[0] === newParentId) {
    return;
  }
  if (toRemove.length === 0 && previousParentIds.includes(newParentId)) {
    return;
  }
  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    fields: 'id',
    addParents: newParentId,
  });
  if (toRemove.length > 0) {
    params.set('removeParents', toRemove.join(','));
  }
  const res = await driveFetch(
    accessToken,
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { method: 'PATCH' },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError(formatDriveRequestFailure('PATCH', 'files (move)', res.status, text), res.status, text);
  }
}

/**
 * Returns true when the file has at least one `type:'anyone'` reader permission.
 * Caller must hold a token with `drive.metadata.readonly` (or `drive` / `drive.file` if owned/shared with app).
 */
function permissionGrantsPublicLink(p: { type?: string; role?: string }): boolean {
  return p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer' || p.role === 'commenter');
}

/**
 * Returns true when the file has at least one `type:'anyone'` reader (or writer/commenter) permission.
 * Paginates `permissions.list` so an `anyone` entry on a later page is not missed.
 *
 * Caller must hold a token with `drive.metadata.readonly` (or `drive` / `drive.file` if owned/shared with app).
 */
export async function driveFileHasAnyoneReader(
  accessToken: string,
  fileId: string,
): Promise<boolean> {
  const id = fileId.trim();
  let pageToken: string | undefined;
  // driveFetch governs transient (429/5xx) retries per request; a survivor throws below.
  do {
    const params = new URLSearchParams({
      fields: 'nextPageToken,permissions(id,type,role)',
      pageSize: '100',
      supportsAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const path = `/files/${encodeURIComponent(id)}/permissions`;
    const res = await driveFetch(accessToken, `${DRIVE_BASE}${path}?${params}`);
    const text = await res.text();
    if (res.ok) {
      const data = JSON.parse(text) as {
        nextPageToken?: string;
        permissions?: Array<{ type?: string; role?: string }>;
      };
      if ((data.permissions ?? []).some(permissionGrantsPublicLink)) {
        return true;
      }
      pageToken = data.nextPageToken?.trim() || undefined;
      continue;
    }
    if (res.status === 404 || res.status === 403) return false;
    throw new DriveHttpError(formatDriveRequestFailure('GET', path, res.status, text), res.status, text);
  } while (pageToken);
  return false;
}
