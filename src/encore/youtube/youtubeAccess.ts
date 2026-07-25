import { requestGoogleAccessToken } from '../../shared/google/googleTokenClient';
import { readPersistedGoogleIdentity } from '../../shared/google/encoreGoogleTokenStorage';

/** YouTube Data API read scope — requested on its OWN consent, never bundled (see below). */
export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

function googleClientId(): string {
  return ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim();
}

/**
 * Request a YouTube-readonly access token via its own Google consent, separate from the
 * Drive/login session token.
 *
 * Google now rejects `youtube.readonly` bundled with `drive.file` in a single authorization
 * ("scopes that cannot be requested together", Error 400 invalid_request) — a YouTube Data API
 * scope can't share a consent screen with other-API scopes. So playlist import asks for the
 * YouTube scope on its own, from a user gesture (incremental auth). Call this only from a click
 * handler; it opens one GIS popup.
 */
export async function ensureYouTubeReadonlyAccessToken(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error('Google sign-in is not configured for this build.');
  }
  const loginHint = readPersistedGoogleIdentity()?.email?.trim() || undefined;
  const { access_token } = await requestGoogleAccessToken(clientId, YOUTUBE_READONLY_SCOPE, {
    loginHint,
  });
  return access_token;
}
