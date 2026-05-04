import { googleEncoreOAuthRedirectUri } from './googleEncoreOAuthRedirectUri';
import { loadGoogleIdentityScript } from './loadGisScript';
import { promiseWithTimeout } from './promiseWithTimeout';

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

/** Override when your Cloud client uses a different string (e.g. `.../encore/` with slash). */
function resolveGoogleOAuthRedirectUri(): string {
  const raw = (import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT_URI as string | undefined)?.trim();
  return raw || googleEncoreOAuthRedirectUri();
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
    const redirectUri = resolveGoogleOAuthRedirectUri();
    const inner = new Promise<{ access_token: string; expires_in?: number }>((resolve, reject) => {
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        redirect_uri: redirectUri,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error_description ?? resp.error ?? 'No access token'));
            return;
          }
          resolve({ access_token: resp.access_token, expires_in: resp.expires_in });
        },
      });
      if (options?.prompt === 'none') client.requestAccessToken({ prompt: 'none' });
      else client.requestAccessToken();
    });
    const timeoutMs = options?.prompt === 'none' ? 12_000 : 90_000;
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
