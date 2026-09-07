import { requestGoogleAccessToken } from '../../shared/google/googleTokenClient';
import { readPersistedGoogleIdentity } from '../../shared/google/encoreGoogleTokenStorage';
import {
  LABS_GOOGLE_DRIVE_FILE_SCOPE,
  LABS_GOOGLE_DRIVE_READONLY_SCOPE,
} from '../../shared/google/labsGoogleDriveAccess';

function googleClientId(): string {
  return ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim();
}

/**
 * Scopes for reading a Drive file **someone else owns**.
 *
 * Encore's session token holds `drive.file` + `drive.metadata.readonly`. That is enough to read the
 * NAME of a file a friend shared — which is why pasting their link resolves and shows a filename —
 * but `drive.file` is per-file access to files *this app created*, so downloading the bytes with
 * `alt=media` is refused. Drive answers 403/404, which the copy path could only report as
 * "you do not have access", when in truth the app had never asked for it.
 *
 * `drive.readonly` is what grants byte access to files the user can already open. It is
 * deliberately NOT in the base sign-in scopes: it is broad (every file in the account), and asking
 * for it up front to serve an occasional case is exactly the over-permissioning users learn to
 * click past. Requested on the gesture that needs it instead — the same incremental-auth shape
 * `ensureYouTubeReadonlyAccessToken` already uses.
 *
 * `drive.file` rides along so the returned token can also WRITE the copy into her performances
 * folder; without it the download would succeed and the upload would fail.
 */
export const ENCORE_DRIVE_COPY_SCOPES = [
  LABS_GOOGLE_DRIVE_FILE_SCOPE,
  LABS_GOOGLE_DRIVE_READONLY_SCOPE,
].join(' ');

/**
 * Token that can read a Drive file the user does not own, and write the copy into her own Drive.
 *
 * Opens one Google consent popup, so call it only from a user gesture. Google will not upgrade an
 * existing grant silently: the first copy after this ships prompts once, then the broadened grant
 * is remembered.
 */
export async function ensureDriveCopyAccessToken(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error('Google sign-in is not configured for this build.');
  }
  const loginHint = readPersistedGoogleIdentity()?.email?.trim() || undefined;
  const { access_token } = await requestGoogleAccessToken(clientId, ENCORE_DRIVE_COPY_SCOPES, {
    loginHint,
  });
  return access_token;
}
