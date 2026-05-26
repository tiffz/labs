import {
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
  DriveHttpError,
} from '../drive/driveFetch';

export async function loadOriginalTakeAudioObjectUrl(
  accessToken: string,
  driveFileId: string,
  mimeTypeHint?: string,
): Promise<{ objectUrl: string; mimeType: string }> {
  const { mediaFileId, meta } = await driveResolveFileForMedia(accessToken, driveFileId);
  const buffer = await driveGetMediaArrayBuffer(accessToken, mediaFileId);
  const mime =
    (meta.mimeType?.startsWith('audio/') ? meta.mimeType : undefined) ??
    mimeTypeHint ??
    'audio/mpeg';
  const blob = new Blob([buffer], { type: mime });
  return { objectUrl: URL.createObjectURL(blob), mimeType: mime };
}

export function originalTakePlaybackErrorMessage(err: unknown): string {
  if (err instanceof DriveHttpError) {
    if (err.status === 401 || err.status === 403) {
      return 'Sign in to Google to play this take.';
    }
    return err.message || 'Could not load audio from Drive.';
  }
  if (err instanceof Error) return err.message;
  return 'Could not load audio from Drive.';
}
