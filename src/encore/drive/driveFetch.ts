const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export class DriveHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = 'DriveHttpError';
  }
}

/** Extract a human-readable line from a Drive v3 JSON error body (falls back to trimmed text). */
export function summarizeDriveApiErrorBody(body: string, maxLen = 320): string {
  const t = body.trim();
  if (!t) return '';
  try {
    const j = JSON.parse(t) as {
      error?: { message?: string; errors?: Array<{ message?: string; reason?: string }> };
    };
    const primary = j.error?.errors?.[0]?.message || j.error?.message;
    if (primary) return primary.length > maxLen ? `${primary.slice(0, maxLen)}…` : primary;
  } catch {
    /* not JSON */
  }
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

function isTransientDriveHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

const TRANSIENT_RETRY_DELAYS_MS = [0, 500, 1500] as const;

export function formatDriveRequestFailure(method: string, path: string, status: number, body: string): string {
  const detail = summarizeDriveApiErrorBody(body);
  const head = `Drive ${method} ${path} (${status})`;
  if (!detail) return head;
  if (status === 403 && /insufficient|scope|authentication|access denied|forbidden/i.test(detail)) {
    return `${head}: ${detail} If you recently changed Google permissions for Encore, use Account → Disconnect Google, then sign in again.`;
  }
  if (status === 401) {
    return `${head}: ${detail} Try signing in to Google again from the Account menu.`;
  }
  return `${head}: ${detail}`;
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
  const res = await fetch(`${DRIVE_BASE}${path}${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('GET', path, res.status, text), res.status, text);
  }
  return JSON.parse(text) as T;
}

export async function driveGetMedia(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('GET', `files/…/alt=media`, res.status, text), res.status, text);
  }
  return text;
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
};

export async function driveListFiles(
  accessToken: string,
  q: string,
  /** Drive returns 400 "Invalid field selection etag" if `etag` is included here; use `files.get` for etags. */
  fields = 'nextPageToken,files(id,name,mimeType,parents,modifiedTime)',
  pageSize = 24,
  pageToken?: string,
): Promise<{ files?: DriveFileListRow[]; nextPageToken?: string }> {
  // Drive v3 rejects some field masks when comma is followed by a space (`nextPageToken, files(...)` → HTTP 400).
  const fieldsParam = fields
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
  const query: Record<string, string> = {
    q,
    fields: fieldsParam,
    spaces: 'drive',
    /** Explicit corpora avoids ambiguous defaults for `q` on some Drive API configurations. */
    corpora: 'user',
    pageSize: String(pageSize),
  };
  if (pageToken) query.pageToken = pageToken;
  return driveGetJson(accessToken, '/files', query);
}

/** Resumable upload (single PUT) for arbitrary binary size within browser memory. */
export async function driveUploadFileResumable(
  accessToken: string,
  file: File,
  parents: string[],
  name?: string,
): Promise<{ id: string }> {
  const fileName = name?.trim() || file.name || 'upload';
  const mimeType = file.type || 'application/octet-stream';
  const init = await fetch(`${UPLOAD_BASE}/files?uploadType=resumable&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify({ name: fileName, parents }),
  });
  const initText = await init.text();
  if (!init.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('POST', 'upload/resumable (init)', init.status, initText), init.status, initText);
  }
  const location = init.headers.get('Location');
  if (!location) {
    throw new DriveHttpError(formatDriveRequestFailure('POST', 'upload/resumable (no Location)', init.status, initText), init.status, initText);
  }
  const put = await fetch(location, {
    method: 'PUT',
    headers: {
      'Content-Length': String(file.size),
      'Content-Type': mimeType,
    },
    body: file,
  });
  const putText = await put.text();
  if (!put.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('PUT', 'upload/resumable', put.status, putText), put.status, putText);
  }
  try {
    return JSON.parse(putText) as { id: string };
  } catch {
    throw new DriveHttpError(formatDriveRequestFailure('PUT', 'upload/resumable (parse)', put.status, putText), put.status, putText);
  }
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
  const res = await fetch(`${UPLOAD_BASE}/files?uploadType=multipart&fields=id,mimeType,modifiedTime`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  if (ifMatch) headers['If-Match'] = ifMatch;

  const res = await fetch(
    `${UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`,
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
  const res = await fetch(`${DRIVE_BASE}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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
  const res = await fetch(`${DRIVE_BASE}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  };
  let lastStatus = 0;
  let lastText = '';
  for (let attempt = 0; attempt < TRANSIENT_RETRY_DELAYS_MS.length; attempt += 1) {
    if (TRANSIENT_RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAYS_MS[attempt]));
    }
    const res = await fetch(url, init);
    if (res.ok) return;
    lastStatus = res.status;
    lastText = await res.text();
    if (!isTransientDriveHttpStatus(lastStatus)) break;
  }
  throw new DriveHttpError(formatDriveRequestFailure('POST', 'files/permissions', lastStatus, lastText), lastStatus, lastText);
}

export async function driveGetFileMetadata(
  accessToken: string,
  fileId: string
): Promise<{
  id: string;
  modifiedTime?: string;
  etag?: string;
  mimeType?: string;
  name?: string;
  parents?: string[];
  /** Populated for `application/vnd.google-apps.shortcut` files. */
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
}> {
  const path = `/files/${encodeURIComponent(fileId)}`;
  const qs = `?${new URLSearchParams({
    fields: 'id,modifiedTime,mimeType,name,parents,shortcutDetails',
    supportsAllDrives: 'true',
  }).toString()}`;
  let lastStatus = 0;
  let lastText = '';
  let res: Response | null = null;
  for (let attempt = 0; attempt < TRANSIENT_RETRY_DELAYS_MS.length; attempt += 1) {
    if (TRANSIENT_RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAYS_MS[attempt]));
    }
    res = await fetch(`${DRIVE_BASE}${path}${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) break;
    lastStatus = res.status;
    lastText = await res.text();
    if (!isTransientDriveHttpStatus(lastStatus)) {
      throw new DriveHttpError(formatDriveRequestFailure('GET', path, lastStatus, lastText), lastStatus, lastText);
    }
  }
  if (!res?.ok) {
    throw new DriveHttpError(formatDriveRequestFailure('GET', path, lastStatus, lastText), lastStatus, lastText);
  }
  const text = await res.text();
  const data = JSON.parse(text) as {
    id: string;
    modifiedTime?: string;
    mimeType?: string;
    name?: string;
    parents?: string[];
    shortcutDetails?: { targetId?: string; targetMimeType?: string };
  };
  return { ...data, etag: etagFromDriveResponse(res) };
}

const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

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
  let lastStatus = 0;
  let res: Response | null = null;
  for (let attempt = 0; attempt < TRANSIENT_RETRY_DELAYS_MS.length; attempt += 1) {
    if (TRANSIENT_RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAYS_MS[attempt]));
    }
    res = await fetch(`${DRIVE_BASE}${path}${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) break;
    lastStatus = res.status;
    await res.text();
    if (!isTransientDriveHttpStatus(lastStatus)) {
      return null;
    }
  }
  if (!res?.ok) return null;
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

/** Rename a file (does not move parents). */
export async function driveRenameFile(
  accessToken: string,
  fileId: string,
  newName: string,
): Promise<void> {
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError(formatDriveRequestFailure('PATCH', 'files (rename)', res.status, text), res.status, text);
  }
}

/**
 * Returns true when the file has at least one `type:'anyone'` reader permission.
 * Caller must hold a token with `drive.metadata.readonly` (or `drive` / `drive.file` if owned/shared with app).
 */
export async function driveFileHasAnyoneReader(
  accessToken: string,
  fileId: string,
): Promise<boolean> {
  const path = `/files/${encodeURIComponent(fileId)}/permissions`;
  const qs = `?${new URLSearchParams({
    fields: 'permissions(id,type,role)',
    supportsAllDrives: 'true',
  }).toString()}`;
  let lastStatus = 0;
  let lastText = '';
  for (let attempt = 0; attempt < TRANSIENT_RETRY_DELAYS_MS.length; attempt += 1) {
    if (TRANSIENT_RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAYS_MS[attempt]));
    }
    const res = await fetch(`${DRIVE_BASE}${path}${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const text = await res.text();
    if (res.ok) {
      const data = JSON.parse(text) as { permissions?: Array<{ type?: string; role?: string }> };
      return (data.permissions ?? []).some(
        (p) => p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer' || p.role === 'commenter'),
      );
    }
    if (res.status === 404 || res.status === 403) return false;
    lastStatus = res.status;
    lastText = text;
    if (!isTransientDriveHttpStatus(res.status)) {
      throw new DriveHttpError(formatDriveRequestFailure('GET', path, res.status, text), res.status, text);
    }
  }
  throw new DriveHttpError(formatDriveRequestFailure('GET', path, lastStatus, lastText), lastStatus, lastText);
}
