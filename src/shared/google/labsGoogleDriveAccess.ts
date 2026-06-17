import { fetchGoogleUserProfile, friendlyGoogleDisplayName } from './loadGisScript';
import {
  isLikelyGoogleAuthRejection,
  isPersistedSessionStillFresh,
  readPersistedGoogleIdentity,
  readPersistedGoogleSession,
  clearPersistedGoogleSession,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
} from './encoreGoogleTokenStorage';
import { requestGoogleAccessToken } from './googleTokenClient';
import {
  isLabsGoogleSessionBffEnabled,
  isRecoverableBffSignInFailure,
  persistLabsGoogleBffSession,
  signInWithGoogleViaBff,
  tryRefreshGoogleAccessTokenViaBff,
} from '../session/labsGoogleSessionPort';

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

function labsGoogleOAuthLoginHint(): string | undefined {
  return readPersistedGoogleIdentity()?.email?.trim() || undefined;
}

/**
 * Returns a usable access token for Drive + userinfo. Nuclear sign-in posture (see
 * [ADR 0011](../../../docs/adr/0011-labs-stanza-scales-no-background-google-refresh.md)):
 *
 * 1. If the locally-persisted Encore session is still fresh, validate it via userinfo and return.
 *    Userinfo is a plain HTTPS call — no Google Identity Services iframe / popup involved.
 * 2. Otherwise: when `interactive: false` (background callers), throw
 *    {@link LabsGoogleInteractiveAuthRequiredError} immediately — callers must retry from a
 *    user gesture. When `interactive: true`, open exactly one GIS popup.
 *
 * The silent `prompt: 'none'` path that used to sit between (1) and (2) has been removed: it was
 * the documented source of ghost iframes / phantom popups that accumulated across Stanza / Scales
 * tabs (see ADR 0010 for the Encore-side rationale and ADR 0011 for the shared-layer extension).
 *
 * @param options.interactive When `false`, never opens the GIS popup — callers must retry from a
 *   **user gesture** (button click) with `interactive: true`. Default `true` (matches the legacy
 *   contract for menu-button callers).
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
      // Anything other than an auth rejection (401/403) — network, parser, etc. — surfaces to
      // the caller. An auth rejection means the persisted token was actually revoked / expired
      // server-side, so we fall through to the interactive-or-throw path below.
      if (!isLikelyGoogleAuthRejection(e)) throw e;
    }
  }

  if (isLabsGoogleSessionBffEnabled()) {
    const refreshed = await tryRefreshGoogleAccessTokenViaBff();
    if (refreshed) return refreshed;
    if (!allowInteractive) throw new LabsGoogleInteractiveAuthRequiredError();
    try {
      const signedIn = await signInWithGoogleViaBff();
      persistLabsGoogleBffSession(signedIn);
      return signedIn.access_token;
    } catch (e) {
      if (!isRecoverableBffSignInFailure(e)) throw e;
    }
  }

  if (!allowInteractive) {
    throw new LabsGoogleInteractiveAuthRequiredError();
  }

  const interactive = await requestGoogleAccessToken(clientId, LABS_GOOGLE_DRIVE_SESSION_SCOPES, {
    loginHint: labsGoogleOAuthLoginHint(),
  });
  const profile = await fetchGoogleUserProfile(interactive.access_token);
  writePersistedGoogleSession(interactive.access_token, interactive.expires_in);
  writePersistedGoogleIdentity({
    email: profile.email,
    displayName: friendlyGoogleDisplayName(profile),
  });
  return interactive.access_token;
}

/**
 * Clears the cached access token and opens Google sign-in from a user gesture.
 * Keeps the remembered email as a login hint. Use from Account → Sign in again.
 */
export async function reconnectLabsGoogleDriveSession(): Promise<string> {
  clearPersistedGoogleSession();
  return ensureLabsGoogleAccessTokenForDrive({ interactive: true });
}
