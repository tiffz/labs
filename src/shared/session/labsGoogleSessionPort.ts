/**
 * Google session port — BFF (ADR 0014) or legacy GIS fallback (ADR 0010/0011).
 *
 * When `VITE_LABS_SESSION_BFF_URL` is set, refresh and interactive sign-in go through the
 * Cloudflare Worker. GIS `prompt: 'none'` is never used.
 */

import {
  LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT,
  writePersistedGoogleIdentity,
  writePersistedGoogleSession,
  readPersistedGoogleSession,
  isPersistedSessionStillFresh,
  clearPersistedGoogleSession,
  clearPersistedGoogleIdentity,
} from '../google/encoreGoogleTokenStorage';

export const LABS_GOOGLE_OAUTH_DONE_MESSAGE = 'labs_google_oauth_done' as const;
export const LABS_GOOGLE_OAUTH_DONE_PATH = '/google-oauth-done.html';

export type LabsGoogleBffTokenResponse = {
  access_token: string;
  expires_in: number;
  expires_at?: number;
  email?: string;
  display_name?: string;
};

export type LabsGoogleOAuthDoneMessage = {
  type: typeof LABS_GOOGLE_OAUTH_DONE_MESSAGE;
  /** Bridge page signals success; parent fetches the access token from the BFF cookie. */
  complete?: boolean;
  access_token?: string;
  expires_in?: number;
  email?: string;
  display_name?: string;
  error?: string;
};

/** BFF base URL without trailing slash, or null when disabled. */
export function readLabsSessionBffUrl(): string | null {
  const raw = (import.meta.env.VITE_LABS_SESSION_BFF_URL as string | undefined)?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

export function isLabsGoogleSessionBffEnabled(): boolean {
  return readLabsSessionBffUrl() != null;
}

/** User-dismissed sign-in — do not auto-fallback to GIS on the same click. */
const BFF_SIGN_IN_USER_ABORT_MESSAGES = [
  'Google sign-in closed before finishing',
  'Sign-in was cancelled',
] as const;

const BFF_OAUTH_POPUP_NAME = 'labs_google_oauth';
const BFF_OAUTH_POPUP_FEATURES = 'width=520,height=640';

function openBffOAuthPopup(): Window {
  // Must run synchronously inside the user click handler — never after `await fetch`.
  const popup = window.open('about:blank', BFF_OAUTH_POPUP_NAME, BFF_OAUTH_POPUP_FEATURES);
  if (!popup) {
    throw new Error('Google sign-in could not open a popup window. Allow popups for this site, then try again.');
  }
  try {
    popup.document.title = 'Signing in…';
    popup.document.body.textContent = 'Opening Google sign-in…';
  } catch {
    // Popup document may be unavailable in some embed contexts.
  }
  return popup;
}

/**
 * When the BFF URL is configured but the Worker is down or misconfigured, callers may fall back
 * to legacy GIS interactive sign-in (ADR 0010). User-aborted popups stay on the BFF error path.
 */
export function isRecoverableBffSignInFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  if (BFF_SIGN_IN_USER_ABORT_MESSAGES.some((fragment) => msg.includes(fragment))) return false;
  return true;
}

function bffOrigin(): string {
  const url = readLabsSessionBffUrl();
  if (!url) throw new Error('Session BFF is not configured.');
  return new URL(url).origin;
}

let refreshInFlight: Promise<LabsGoogleBffTokenResponse> | null = null;

/**
 * Refresh the Google access token via the session BFF (HttpOnly cookie auth).
 * Single-flight: concurrent callers share one request.
 */
export async function refreshGoogleAccessTokenViaBff(): Promise<LabsGoogleBffTokenResponse> {
  if (refreshInFlight) return refreshInFlight;
  const bffUrl = readLabsSessionBffUrl();
  if (!bffUrl) throw new Error('Session BFF is not configured.');

  refreshInFlight = (async () => {
    const res = await fetch(`${bffUrl}/v1/session/google/access-token`, {
      method: 'GET',
      credentials: 'include',
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string } & Partial<LabsGoogleBffTokenResponse>;
    if (!res.ok) {
      throw new Error(body.error ?? `Session refresh failed (${res.status}).`);
    }
    if (!body.access_token) throw new Error('Session refresh returned no access token.');
    return {
      access_token: body.access_token,
      expires_in: body.expires_in ?? 3600,
      expires_at: body.expires_at,
      email: body.email,
      display_name: body.display_name,
    };
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function signOutGoogleViaBff(): Promise<void> {
  const bffUrl = readLabsSessionBffUrl();
  if (!bffUrl) return;
  await fetch(`${bffUrl}/v1/session/google/sign-out`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

/**
 * Opens the BFF OAuth popup (user gesture required). Resolves with fresh access token metadata.
 */
export async function signInWithGoogleViaBff(options?: {
  returnOrigin?: string;
}): Promise<LabsGoogleBffTokenResponse> {
  const bffUrl = readLabsSessionBffUrl();
  if (!bffUrl) throw new Error('Session BFF is not configured.');

  const popup = openBffOAuthPopup();

  const returnOrigin = options?.returnOrigin ?? window.location.origin;
  const startUrl = new URL(`${bffUrl}/v1/oauth/google/start`);
  startUrl.searchParams.set('return_origin', returnOrigin);
  startUrl.searchParams.set('popup', '1');

  let startBody: { authUrl?: string; error?: string };
  try {
    let startRes: Response;
    try {
      startRes = await fetch(startUrl.toString(), { credentials: 'include' });
    } catch {
      throw new Error('Session service unreachable.');
    }
    startBody = (await startRes.json().catch(() => ({}))) as { authUrl?: string; error?: string };
    if (!startRes.ok || !startBody.authUrl) {
      throw new Error(startBody.error ?? 'Could not start Google sign-in.');
    }
    popup.location.href = startBody.authUrl;
  } catch (e) {
    if (!popup.closed) popup.close();
    throw e;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const expectedBffOrigin = bffOrigin();

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(closedPoll);
      fn();
    };

    const onMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([expectedBffOrigin, returnOrigin]);
      if (!allowedOrigins.has(event.origin)) return;
      const data = event.data as LabsGoogleOAuthDoneMessage | undefined;
      if (!data || data.type !== LABS_GOOGLE_OAUTH_DONE_MESSAGE) return;
      if (data.error) {
        finish(() => reject(new Error(data.error)));
        return;
      }
      if (data.complete && !data.access_token) {
        finish(() => {
          void refreshGoogleAccessTokenViaBff()
            .then(resolve)
            .catch((e) =>
              reject(e instanceof Error ? e : new Error('Sign-in finished but session refresh failed.')),
            );
        });
        return;
      }
      if (!data.access_token) {
        finish(() => reject(new Error('Sign-in finished without an access token.')));
        return;
      }
      finish(() =>
        resolve({
          access_token: data.access_token!,
          expires_in: data.expires_in ?? 3600,
          email: data.email,
          display_name: data.display_name,
        }),
      );
    };

    const closedPoll = window.setInterval(() => {
      if (popup.closed) {
        finish(() => reject(new Error('Google sign-in closed before finishing. Try again and complete the Google window.')));
      }
    }, 400);

    window.addEventListener('message', onMessage);
  });
}

/** Persist BFF token response to shared Encore session storage + identity. */
export function persistLabsGoogleBffSession(response: LabsGoogleBffTokenResponse): void {
  writePersistedGoogleSession(response.access_token, response.expires_in);
  if (response.email) {
    writePersistedGoogleIdentity({
      email: response.email,
      displayName: response.display_name?.trim() || response.email,
    });
    window.dispatchEvent(new Event(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT));
  }
}

/**
 * Try BFF refresh when enabled. Returns null when BFF is disabled or refresh fails.
 */
export async function tryRefreshGoogleAccessTokenViaBff(): Promise<string | null> {
  if (!isLabsGoogleSessionBffEnabled()) return null;
  try {
    const refreshed = await refreshGoogleAccessTokenViaBff();
    persistLabsGoogleBffSession(refreshed);
    return refreshed.access_token;
  } catch {
    return null;
  }
}

/**
 * Returns a fresh access token when BFF is enabled: uses persisted token if fresh, else BFF refresh.
 * When BFF refresh and interactive sign-in fail recoverably, returns null (caller should use GIS).
 */
export async function getGoogleAccessTokenViaBff(options?: {
  interactive?: boolean;
}): Promise<string | null> {
  if (!isLabsGoogleSessionBffEnabled()) return null;

  const stored = readPersistedGoogleSession();
  if (stored && isPersistedSessionStillFresh(stored)) {
    return stored.accessToken;
  }

  const refreshed = await tryRefreshGoogleAccessTokenViaBff();
  if (refreshed) return refreshed;

  if (options?.interactive === false) {
    return null;
  }

  try {
    const signedIn = await signInWithGoogleViaBff();
    persistLabsGoogleBffSession(signedIn);
    return signedIn.access_token;
  } catch (e) {
    if (isRecoverableBffSignInFailure(e)) return null;
    throw e;
  }
}

/** Clear local session storage and BFF cookie. */
export async function clearLabsGoogleSessionEverywhere(): Promise<void> {
  clearPersistedGoogleSession();
  clearPersistedGoogleIdentity();
  await signOutGoogleViaBff();
  window.dispatchEvent(new Event(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT));
}
