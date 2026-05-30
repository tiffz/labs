import {
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
  DriveHttpError,
} from './driveFetch';
import { triggerBlobDownload } from '../../shared/utils/triggerBlobDownload';
import type { EncoreMiscResource } from '../types';
import type { OriginalAudioTake } from '../originals/types';

export type EncoreResourceDownloadTarget = {
  filename: string;
  driveFileId?: string;
  url?: string;
  mimeType?: string;
};

export function isEncoreResourceDownloadable(resource: {
  driveFileId?: string;
  url?: string;
}): boolean {
  if (resource.driveFileId?.trim()) return true;
  const url = resource.url?.trim() ?? '';
  return url.startsWith('blob:') || /^https?:\/\//i.test(url);
}

export function encoreResourceDownloadDisabled(
  resource: { driveFileId?: string; url?: string },
  accessToken: string | null,
): { disabled: boolean; reason?: string } {
  if (resource.driveFileId?.trim() && !accessToken) {
    return { disabled: true, reason: 'Sign in to Google to download' };
  }
  return { disabled: false };
}

export function encoreResourceDownloadTargetFromMisc(
  resource: EncoreMiscResource,
): EncoreResourceDownloadTarget | null {
  if (!isEncoreResourceDownloadable(resource)) return null;
  return {
    filename: resource.label.trim() || 'file',
    driveFileId: resource.driveFileId,
    url: resource.url,
    mimeType: resource.mimeType,
  };
}

export function encoreResourceDownloadTargetFromTake(
  take: OriginalAudioTake,
): EncoreResourceDownloadTarget | null {
  if (!take.driveFileId?.trim()) return null;
  return {
    filename: take.label.trim() || 'take',
    driveFileId: take.driveFileId,
    mimeType: take.mimeType,
  };
}

export function encoreResourceDownloadTargetFromDriveFile(
  filename: string,
  driveFileId: string,
  mimeType?: string,
): EncoreResourceDownloadTarget {
  return {
    filename: filename.trim() || 'file',
    driveFileId,
    mimeType,
  };
}

function extensionFromMime(mime: string): string {
  const normalized = mime.toLowerCase().split(';')[0]?.trim() ?? '';
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav',
    'audio/webm': '.webm',
    'audio/aac': '.aac',
    'audio/flac': '.flac',
    'audio/ogg': '.ogg',
    'text/plain': '.txt',
  };
  if (map[normalized]) return map[normalized]!;
  if (normalized.startsWith('audio/')) return `.${normalized.slice('audio/'.length)}`;
  if (normalized.startsWith('video/')) return `.${normalized.slice('video/'.length)}`;
  return '';
}

function ensureDownloadFilename(preferred: string, driveName?: string, mime?: string): string {
  const base = preferred.trim() || driveName?.trim() || 'download';
  if (/\.[a-z0-9]{1,8}$/i.test(base)) return base;
  if (driveName?.includes('.')) {
    return `${base}${driveName.slice(driveName.lastIndexOf('.'))}`;
  }
  const ext = mime ? extensionFromMime(mime) : '';
  return ext ? `${base}${ext}` : base;
}

async function downloadHttpUrl(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      triggerBlobDownload(await res.blob(), filename);
      return;
    }
  } catch {
    /* fall through to anchor navigation */
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function triggerEncoreResourceDownload(
  target: EncoreResourceDownloadTarget,
  accessToken: string | null,
): Promise<void> {
  const driveId = target.driveFileId?.trim();
  const url = target.url?.trim();

  if (driveId && accessToken) {
    const { mediaFileId, meta } = await driveResolveFileForMedia(accessToken, driveId);
    const buffer = await driveGetMediaArrayBuffer(accessToken, mediaFileId);
    const mime = target.mimeType ?? meta.mimeType ?? 'application/octet-stream';
    const filename = ensureDownloadFilename(target.filename, meta.name, mime);
    triggerBlobDownload(new Blob([buffer], { type: mime }), filename);
    return;
  }

  if (url) {
    await downloadHttpUrl(url, ensureDownloadFilename(target.filename, undefined, target.mimeType));
    return;
  }

  if (driveId) {
    throw new DriveHttpError('Sign in to Google to download this file.', 403);
  }

  throw new Error('No downloadable file attached.');
}

export function encoreResourceDownloadErrorMessage(err: unknown): string {
  if (err instanceof DriveHttpError) {
    if (err.status === 401 || err.status === 403) return 'Sign in to Google to download this file.';
    return err.message || 'Could not download file from Drive.';
  }
  if (err instanceof Error) return err.message;
  return 'Could not download file.';
}
