import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';

export type LyreflyGoogleDriveAccessOptions = {
  interactive?: boolean;
};

/** Portfolio backup OAuth for Lyrefly (`drive.file` scope). */
export async function ensureLyreflyGoogleDriveAccess(
  options?: LyreflyGoogleDriveAccessOptions,
): Promise<string> {
  return ensureLabsGoogleAccessTokenForDrive({
    interactive: options?.interactive ?? true,
  });
}

export async function signInLyreflyGoogleDrive(): Promise<string> {
  return ensureLyreflyGoogleDriveAccess({ interactive: true });
}
