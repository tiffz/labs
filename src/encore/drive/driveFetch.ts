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
    throw new DriveHttpError(`Drive GET ${path}`, res.status, text);
  }
  return JSON.parse(text) as T;
}

export async function driveGetMedia(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError('Drive alt=media', res.status, text);
  }
  return text;
}

export async function driveListFiles(
  accessToken: string,
  q: string,
  fields = 'files(id,name,mimeType,parents,modifiedTime,etag)'
): Promise<{ files?: Array<Record<string, unknown>> }> {
  return driveGetJson(accessToken, '/files', {
    q,
    fields,
    spaces: 'drive',
    pageSize: '20',
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

  const res = await fetch(`${UPLOAD_BASE}/files?uploadType=multipart&fields=id,mimeType,etag,modifiedTime`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError('Drive multipart create', res.status, text);
  }
  return JSON.parse(text) as { id: string; mimeType?: string; etag?: string; modifiedTime?: string };
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
    `${UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,etag,modifiedTime`,
    { method: 'PATCH', headers, body }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new DriveHttpError('Drive media patch', res.status, text);
  }
  return JSON.parse(text) as { id: string; etag?: string; modifiedTime?: string };
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
    throw new DriveHttpError('Drive create folder', res.status, text);
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
    throw new DriveHttpError('Drive create shortcut', res.status, text);
  }
  return JSON.parse(text) as { id: string };
}

export async function driveCreateAnyoneReaderPermission(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new DriveHttpError('Drive permission', res.status, text);
  }
}

export async function driveGetFileMetadata(
  accessToken: string,
  fileId: string
): Promise<{ id: string; modifiedTime?: string; etag?: string; mimeType?: string; name?: string }> {
  return driveGetJson(accessToken, `/files/${encodeURIComponent(fileId)}`, {
    fields: 'id,modifiedTime,etag,mimeType,name',
  });
}
