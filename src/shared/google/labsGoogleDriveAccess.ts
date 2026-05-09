import { fetchGoogleUserProfile, friendlyGoogleDisplayName } from './loadGisScript';
import {
  isLikelyGoogleAuthRejection,
  isPersistedSessionStillFresh,
  readPersistedGoogleSession,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from './encoreGoogleTokenStorage';
import { requestGoogleAccessToken } from './googleTokenClient';

/** User-visible copy when GIS needs a popup from a click (not from automatic page load). */
export const LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT =
  'Tap Continue so Google can open a short sign-in window. If your browser asks, allow popups for this site.';

/** Thrown when a fresh token needs GIS interactive (popup) auth — must run from a user gesture. */
export class LabsGoogleInteractiveAuthRequiredError extends Error {
  readonly code = 'labs_google_interactive_auth_required' as const;

  constructor() {
    super(LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT);
    this.name = 'LabsGoogleInteractiveAuthRequiredError';
  }
}

/**
 * Minimal scopes for portfolio Drive backup (incremental auth on user action).
 * `drive.file` — files created by this app only, per Google's restricted-scope contract.
 */
export const LABS_GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * Scopes for Labs Drive token refresh (Stanza/Scales + shared storage with Encore).
 * Matches Encore `GOOGLE_SCOPES` so `writePersistedGoogleSession` from Labs apps does not replace
 * Encore’s token with a narrower one (which would break YouTube / Drive metadata in Encore).
 */
export const LABS_GOOGLE_DRIVE_SESSION_SCOPES = [
  LABS_GOOGLE_DRIVE_FILE_SCOPE,
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

function getGoogleClientId(): string {
  return ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim();
}

/**
 * Returns a usable access token for Drive + userinfo: prefers a fresh Encore-persisted token after
 * userinfo validation; otherwise silent then interactive GIS refresh with minimal scopes.
 *
 * @param options.interactive When `false`, does not open the GIS popup if silent refresh fails —
 *   callers must retry from a **user gesture** (button click) with `interactive: true`.
 */
export async function ensureLabsGoogleAccessTokenForDrive(options?: {
  interactive?: boolean;
}): Promise<string> {
  const allowInteractive = options?.interactive !== false;
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Google sign-in is not configured for this build.');

  const stored = readPersistedGoogleSession();
  if (stored && isPersistedSessionStillFresh(stored)) {
    try {
      const profile = await fetchGoogleUserProfile(stored.accessToken);
      writePersistedGoogleIdentity({
        email: profile.email,
        displayName: friendlyGoogleDisplayName(profile),
      });
      return stored.accessToken;
    } catch (e) {
      if (!isLikelyGoogleAuthRejection(e)) throw e;
    }
  }

  try {
    const silent = await requestGoogleAccessToken(clientId, LABS_GOOGLE_DRIVE_SESSION_SCOPES, {
      prompt: 'none',
    });
    const profile = await fetchGoogleUserProfile(silent.access_token);
    writePersistedGoogleSession(silent.access_token, silent.expires_in);
    writePersistedGoogleIdentity({
      email: profile.email,
      displayName: friendlyGoogleDisplayName(profile),
    });
    return silent.access_token;
  } catch {
    /* fall through to interactive */
  }

  if (!allowInteractive) {
    throw new LabsGoogleInteractiveAuthRequiredError();
  }

  const interactive = await requestGoogleAccessToken(clientId, LABS_GOOGLE_DRIVE_SESSION_SCOPES);
  const profile = await fetchGoogleUserProfile(interactive.access_token);
  writePersistedGoogleSession(interactive.access_token, interactive.expires_in);
  writePersistedGoogleIdentity({
    email: profile.email,
    displayName: friendlyGoogleDisplayName(profile),
  });
  return interactive.access_token;
}
