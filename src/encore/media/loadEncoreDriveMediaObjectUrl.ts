import {
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
  DriveHttpError,
} from '../drive/driveFetch';
import { encoreDrivePlaybackKind, resolveEncoreDriveMediaMime } from './encorePlayableMedia';

export async function loadEncoreDriveMediaObjectUrl(
  accessToken: string,
  driveFileId: string,
  mimeTypeHint?: string,
  fileNameHint?: string,
): Promise<{ objectUrl: string; mimeType: string; kind: 'drive-audio' | 'drive-video' }> {
  const { mediaFileId, meta } = await driveResolveFileForMedia(accessToken, driveFileId);
  const buffer = await driveGetMediaArrayBuffer(accessToken, mediaFileId);
  const mime = resolveEncoreDriveMediaMime({
    fileName: meta.name ?? fileNameHint,
    mimeType: meta.mimeType,
    mimeTypeHint,
  });
  const kind = encoreDrivePlaybackKind(mime) ?? 'drive-audio';
  const blobMime = mime === 'application/octet-stream' ? 'audio/mpeg' : mime;
  const blob = new Blob([buffer], { type: blobMime });
  return { objectUrl: URL.createObjectURL(blob), mimeType: blobMime, kind };
}

export async function loadEncoreDriveMediaAudioBuffer(
  accessToken: string,
  driveFileId: string,
): Promise<AudioBuffer> {
  const { mediaFileId } = await driveResolveFileForMedia(accessToken, driveFileId);
  const buffer = await driveGetMediaArrayBuffer(accessToken, mediaFileId);
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(buffer.slice(0));
  } finally {
    void ctx.close();
  }
}

export function encoreDriveMediaPlaybackErrorMessage(err: unknown): string {
  if (err instanceof DriveHttpError) {
    if (err.status === 401 || err.status === 403) {
      return 'Sign in to Google to play this file.';
    }
    return err.message || 'Could not load media from Drive.';
  }
  if (err instanceof Error) return err.message;
  return 'Could not load media from Drive.';
}
