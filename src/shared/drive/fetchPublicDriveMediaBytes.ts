import { buildPublicDriveAltMediaUrl, buildPublicDriveFileMetadataUrl, resolvePublicDriveFetchRoute } from './buildPublicDriveAltMediaUrl';
import { GOOGLE_DRIVE_SHORTCUT_MIME } from './driveFetch';

export class PublicDriveMediaError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'PublicDriveMediaError';
  }
}

/**
 * Guest read of file bytes via browser API key (`VITE_GOOGLE_API_KEY`).
 * The file must be readable with `anyoneWithLink` / `anyone` Drive permissions (same model as Encore guest snapshots).
 */
export type PublicDriveFileMetadata = {
  mimeType?: string;
  name?: string;
  shortcutDetails?: { targetId?: string };
};

export async function fetchPublicDriveFileMetadata(fileId: string): Promise<PublicDriveFileMetadata> {
  const route = resolvePublicDriveFetchRoute();
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  if (route === 'direct' && !apiKey) {
    throw new PublicDriveMediaError('This build is missing VITE_GOOGLE_API_KEY, so Drive files cannot be opened anonymously.', 503);
  }
  const url = buildPublicDriveFileMetadataUrl(fileId, apiKey ?? '');
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
  } catch {
    throw new PublicDriveMediaError('Network error while loading file metadata from Google Drive.', 0);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new PublicDriveMediaError(
      res.status === 403
        ? 'This file is not publicly readable. Open Stanza while signed into Google (Encore) or ask the owner to share the file with “Anyone with the link”.'
        : res.status === 404
          ? 'This Drive file was not found.'
          : `Could not read Drive metadata (HTTP ${res.status}).`,
      res.status,
    );
  }
  try {
    return JSON.parse(text) as PublicDriveFileMetadata;
  } catch {
    throw new PublicDriveMediaError('Drive returned invalid metadata JSON.', res.status);
  }
}

/**
 * For API-key reads, walk shortcut rows to the binary target id (same as OAuth {@link driveResolveFileForMedia}).
 */
export async function resolvePublicDriveFileForMedia(
  fileId: string,
  maxDepth = 6,
): Promise<{ mediaFileId: string; mimeType?: string; name?: string }> {
  let id = fileId.trim();
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const meta = await fetchPublicDriveFileMetadata(id);
    const next = meta.shortcutDetails?.targetId?.trim();
    if (meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME && next) {
      id = next;
      continue;
    }
    if (meta.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME) {
      throw new PublicDriveMediaError('This Drive shortcut has no resolvable target file.', 400);
    }
    return { mediaFileId: id, mimeType: meta.mimeType, name: meta.name };
  }
  throw new PublicDriveMediaError('This Drive shortcut chain is too long.', 400);
}

export async function fetchPublicDriveMediaWithApiKey(fileId: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const route = resolvePublicDriveFetchRoute();
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  if (route === 'direct' && !apiKey) {
    throw new PublicDriveMediaError('This build is missing VITE_GOOGLE_API_KEY, so Drive files cannot be opened anonymously.', 503);
  }
  const url = buildPublicDriveAltMediaUrl(fileId, apiKey ?? '');
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
  } catch {
    throw new PublicDriveMediaError('Network error while loading this file from Google Drive.', 0);
  }
  const buf = await res.arrayBuffer();
  if (!res.ok) {
    throw new PublicDriveMediaError(
      res.status === 403
        ? 'This file is not publicly readable. Open Stanza while signed into Google (Encore) or ask the owner to share the file with “Anyone with the link”.'
        : res.status === 404
          ? 'This Drive file was not found.'
          : `Could not load this file from Drive (HTTP ${res.status}).`,
      res.status,
    );
  }
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
  return { buffer: buf, contentType };
}

/**
 * True when `files.get` metadata succeeds with the browser Drive API key (no OAuth).
 * Matches what anonymous guests can do — Encore’s OAuth scopes often **cannot** call
 * `permissions.list` on the same file even when it is “Anyone with the link”, so snapshot
 * publishing uses this as a second probe after the OAuth permission check.
 */
export async function isPublicDriveFileMetadataReadable(fileId: string): Promise<boolean> {
  const route = resolvePublicDriveFetchRoute();
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  if (route === 'direct' && !apiKey) return false;
  const url = buildPublicDriveFileMetadataUrl(fileId.trim(), apiKey ?? '');
  try {
    const res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    return res.ok;
  } catch {
    return false;
  }
}
