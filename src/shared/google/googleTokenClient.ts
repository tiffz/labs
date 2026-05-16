import { loadGoogleIdentityScript, type GoogleTokenClient } from './loadGisScript';
import { resolveLabsGoogleOAuthRedirectUri } from './labsGoogleOAuthRedirectUri';
import { promiseWithTimeout } from '../utils/promiseWithTimeout';

/**
 * GIS `initTokenClient` + `requestAccessToken` can flash a consent UI if several calls overlap
 * (silent refresh + visibility + bootstrap). Serialize so only one token exchange runs at a time.
 */
let googleAccessTokenRequestChain: Promise<unknown> = Promise.resolve();

function runSerializedGoogleTokenRequest<T>(task: () => Promise<T>): Promise<T> {
  const run = googleAccessTokenRequestChain.then(() => task());
  googleAccessTokenRequestChain = run.catch(() => {
    /* keep the queue alive even when GIS returns an error */
  });
  return run;
}

/**
 * Cache one GIS TokenClient per (clientId, scope, loginHint) tuple. Each call to
 * `initTokenClient` mounts a hidden `accounts.google.com/gsi/transform` iframe that GIS does not
 * garbage-collect — without this cache, repeated silent token refreshes (every visibility flip,
 * every Drive backup retry) leak iframes until the page bogs down. Reusing the same client and
 * mutating its `callback` per call is the documented Google pattern for this.
 */
const googleTokenClientCache = new Map<string, GoogleTokenClient>();

function tokenClientCacheKey(clientId: string, scope: string, loginHint: string | undefined): string {
  return `${clientId}\u0000${scope}\u0000${loginHint ?? ''}`;
}

function getOrCreateGoogleTokenClient(
  clientId: string,
  scope: string,
  loginHint: string | undefined,
): GoogleTokenClient {
  const key = tokenClientCacheKey(clientId, scope, loginHint);
  const cached = googleTokenClientCache.get(key);
  if (cached) return cached;
  const g = window.google?.accounts?.oauth2;
  if (!g) throw new Error('Google sign-in could not load.');
  const redirectUri = resolveLabsGoogleOAuthRedirectUri();
  const client = g.initTokenClient({
    client_id: clientId,
    scope,
    ...(loginHint ? { login_hint: loginHint } : {}),
    redirect_uri: redirectUri,
    // Concrete callback / error_callback are reassigned per request below before
    // `requestAccessToken` is invoked. We install no-op stubs here so the GIS init contract is
    // satisfied even if a token response races a freshly-cached client.
    callback: () => undefined,
    error_callback: () => undefined,
  });
  googleTokenClientCache.set(key, client);
  return client;
}

/** Maps GIS `error_callback` reasons (see TokenClientConfig in Google’s OAuth JS reference). */
function messageForGisTokenUxError(detail: { type?: string }): string {
  switch (detail.type) {
    case 'popup_failed_to_open':
      return 'Google sign-in could not open a popup window. Allow popups for this site, then try again.';
    case 'popup_closed':
      return 'Google sign-in closed before finishing. Try again and complete the Google window.';
    case 'unknown':
    default:
      return 'Google sign-in did not finish (browser or network interrupted the flow). Try again.';
  }
}

export async function requestGoogleAccessToken(
  clientId: string,
  scope: string,
  options?: { prompt?: 'none' | 'consent' | 'select_account'; loginHint?: string },
): Promise<{ access_token: string; expires_in?: number }> {
  return runSerializedGoogleTokenRequest(async () => {
    await loadGoogleIdentityScript();
    const loginHint = options?.loginHint?.trim();
    const client = getOrCreateGoogleTokenClient(clientId, scope, loginHint);
    const inner = new Promise<{ access_token: string; expires_in?: number }>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      // Mutate per-request: the GIS TokenClient supports reassigning its `callback` /
      // `error_callback` between `requestAccessToken` calls so a single client can serve many
      // requests. Pairs with `runSerializedGoogleTokenRequest` so two requests on the same
      // client never overlap and stomp each other's callbacks.
      client.callback = (resp) => {
        const accessToken = resp.access_token;
        if (resp.error || !accessToken) {
          finish(() =>
            reject(new Error(resp.error_description ?? resp.error ?? 'No access token')),
          );
          return;
        }
        finish(() => resolve({ access_token: accessToken, expires_in: resp.expires_in }));
      };
      client.error_callback = (detail) => {
        finish(() => reject(new Error(messageForGisTokenUxError(detail))));
      };
      if (options?.prompt === 'none') client.requestAccessToken({ prompt: 'none' });
      else client.requestAccessToken();
    });
    const timeoutMs = options?.prompt === 'none' ? 12_000 : 60_000;
    return promiseWithTimeout(inner, timeoutMs, 'Google sign-in');
  });
}

export function revokeGoogleAccessTokenBestEffort(accessToken: string): void {
  void loadGoogleIdentityScript()
    .then(() => {
      window.google?.accounts?.oauth2?.revoke?.(accessToken, () => undefined);
    })
    .catch(() => undefined);
}
