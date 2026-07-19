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
  readLastLabsBffRefreshErrorCode,
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

/**
 * Adds `drive.readonly` so apps can download PDFs (or other files) from folders the user pastes
 * or can already open in Drive. Listing works with `drive.metadata.readonly` alone; `alt=media`
 * needs read access to file bytes.
 */
export const LABS_GOOGLE_DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export const LABS_GOOGLE_DRIVE_IMPORT_SCOPES = [
  LABS_GOOGLE_DRIVE_FILE_SCOPE,
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  LABS_GOOGLE_DRIVE_READONLY_SCOPE,
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
  return ensureLabsGoogleAccessTokenForDriveScopes(LABS_GOOGLE_DRIVE_SESSION_SCOPES, options);
}

/**
 * Token for bulk import from pasted Drive folders (includes {@link LABS_GOOGLE_DRIVE_READONLY_SCOPE}).
 * Pass `upgradeScopes: true` from a button click when download fails or before the first import.
 */
export async function ensureLabsGoogleAccessTokenForDriveImport(options?: {
  interactive?: boolean;
  /** When true, skip the cached token and request import scopes via GIS (grants read access). */
  upgradeScopes?: boolean;
  skipBff?: boolean;
}): Promise<string> {
  return ensureLabsGoogleAccessTokenForDriveScopes(LABS_GOOGLE_DRIVE_IMPORT_SCOPES, {
    ...options,
    skipBff: options?.skipBff ?? true,
    upgradeScopes: options?.upgradeScopes ?? false,
  });
}

async function ensureLabsGoogleAccessTokenForDriveScopes(
  scopes: string,
  options?: {
    interactive?: boolean;
    upgradeScopes?: boolean;
    /** When true, use GIS directly (same click). Avoids BFF popup → failed bridge → GIS without gesture. */
    skipBff?: boolean;
  },
): Promise<string> {
  const allowInteractive = options?.interactive !== false;
  const upgradeScopes = options?.upgradeScopes === true;
  const skipBff = options?.skipBff === true || upgradeScopes;
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Google sign-in is not configured for this build.');

  const stored = readPersistedGoogleSession();
  if (!upgradeScopes && stored && isPersistedSessionStillFresh(stored)) {
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

  if (isLabsGoogleSessionBffEnabled() && !skipBff) {
    const refreshed = await tryRefreshGoogleAccessTokenViaBff();
    if (refreshed && !upgradeScopes) return refreshed;
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

  const interactive = await requestGoogleAccessToken(clientId, scopes, {
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
 * Clears the cached access token and re-establishes the session from a user gesture.
 * Tries a **silent BFF cookie refresh first** (no popup, no gesture consumed) — most
 * "reconnect" clicks are just an expired access token with a live BFF session, so
 * forcing a Google popup for those was needless friction. Only when the silent
 * refresh fails (or scopes must be upgraded) does the GIS popup open on the same
 * click. Keeps the remembered email as a login hint. Use from Account → Sign in again.
 */
export async function reconnectLabsGoogleDriveSession(options?: {
  /** Request {@link LABS_GOOGLE_DRIVE_IMPORT_SCOPES} (Zine Box Drive folder import). */
  importScopes?: boolean;
}): Promise<string> {
  clearPersistedGoogleSession();
  const upgradeScopes = Boolean(options?.importScopes);
  if (!upgradeScopes && isLabsGoogleSessionBffEnabled()) {
    const refreshed = await tryRefreshGoogleAccessTokenViaBff();
    if (refreshed) return refreshed;
    // Rate limited means the session works — a popup would only confuse. Surface it.
    if (readLastLabsBffRefreshErrorCode() === 'rate_limited') {
      throw new Error('Google session was refreshed moments ago. Wait a few seconds and try again.');
    }
  }
  const scopes = options?.importScopes ? LABS_GOOGLE_DRIVE_IMPORT_SCOPES : LABS_GOOGLE_DRIVE_SESSION_SCOPES;
  return ensureLabsGoogleAccessTokenForDriveScopes(scopes, {
    interactive: true,
    upgradeScopes,
    skipBff: true,
  });
}
