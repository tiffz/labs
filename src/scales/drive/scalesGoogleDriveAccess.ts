import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';

export async function ensureScalesGoogleDriveAccess(options?: {
  interactive?: boolean;
}): Promise<string> {
  return ensureLabsGoogleAccessTokenForDrive({
    interactive: options?.interactive ?? true,
  });
}

export async function signInScalesGoogleDrive(): Promise<void> {
  await ensureScalesGoogleDriveAccess({ interactive: true });
}
