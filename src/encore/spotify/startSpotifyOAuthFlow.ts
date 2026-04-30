import { createPkcePair, spotifyAuthorizeUrl, storePkceVerifier } from './pkce';
import { ENCORE_SPOTIFY_SCOPES } from './spotifyScopes';
import { encoreLoopbackUrlFromCurrent, getSpotifyRedirectUri } from './spotifyRedirectUri';

export type StartSpotifyOAuthFlowResult =
  | { ok: true; kind: 'redirect' }
  | { ok: false; message: string; openOnLoopbackUrl?: string };

/** Starts Spotify authorization (full-page redirect). Caller should show `message` when `ok` is false. */
export async function startSpotifyOAuthFlow(clientId: string): Promise<StartSpotifyOAuthFlowResult> {
  const id = clientId.trim();
  if (!id) {
    return { ok: false, message: 'Set VITE_SPOTIFY_CLIENT_ID to use Spotify.' };
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const openOnLoopbackUrl = encoreLoopbackUrlFromCurrent() || undefined;
    return {
      ok: false,
      message:
        'Spotify does not allow localhost as a redirect URI. Open Encore on 127.0.0.1, register that URL in the Spotify app, then try again.',
      openOnLoopbackUrl,
    };
  }
  const { verifier, challenge } = await createPkcePair();
  storePkceVerifier(verifier);
  const state = crypto.randomUUID();
  sessionStorage.setItem('encore_spotify_oauth_state', state);
  window.location.assign(
    spotifyAuthorizeUrl({
      clientId: id,
      redirectUri: getSpotifyRedirectUri(),
      challenge,
      state,
      scope: ENCORE_SPOTIFY_SCOPES,
    }),
  );
  return { ok: true, kind: 'redirect' };
}
