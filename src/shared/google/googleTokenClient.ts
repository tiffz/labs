import { loadGoogleIdentityScript } from './loadGisScript';
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
  options?: { prompt?: 'none' | 'consent' | 'select_account' },
): Promise<{ access_token: string; expires_in?: number }> {
  return runSerializedGoogleTokenRequest(async () => {
    await loadGoogleIdentityScript();
    const g = window.google?.accounts?.oauth2;
    if (!g) throw new Error('Google sign-in could not load.');
    const redirectUri = resolveLabsGoogleOAuthRedirectUri();
    const inner = new Promise<{ access_token: string; expires_in?: number }>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        redirect_uri: redirectUri,
        error_callback: (detail) => {
          finish(() => reject(new Error(messageForGisTokenUxError(detail))));
        },
        callback: (resp) => {
          const accessToken = resp.access_token;
          if (resp.error || !accessToken) {
            finish(() =>
              reject(new Error(resp.error_description ?? resp.error ?? 'No access token')),
            );
            return;
          }
          finish(() => resolve({ access_token: accessToken, expires_in: resp.expires_in }));
        },
      });
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
