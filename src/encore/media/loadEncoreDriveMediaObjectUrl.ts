import { DriveHttpError } from '../drive/driveFetch';

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
