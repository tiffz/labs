import { consumePkceVerifier, exchangeSpotifyCode, storeSpotifyToken } from './pkce';
import { encoreLoopbackUrlFromCurrent, getSpotifyRedirectUri } from './spotifyRedirectUri';

const OAUTH_FLASH_ERROR_KEY = 'encore_spotify_oauth_flash_error';
const OAUTH_FLASH_LOOPBACK_KEY = 'encore_spotify_oauth_flash_loopback';

export type SpotifyOAuthFlashPayload = { message: string; loopbackUrl?: string };

/** One-time message (and optional 127.0.0.1 link) after a failed Spotify redirect; shown in import UI then cleared. */
export function readAndClearSpotifyOAuthFlash(): SpotifyOAuthFlashPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const msg = sessionStorage.getItem(OAUTH_FLASH_ERROR_KEY);
    const loop = sessionStorage.getItem(OAUTH_FLASH_LOOPBACK_KEY);
    sessionStorage.removeItem(OAUTH_FLASH_ERROR_KEY);
    sessionStorage.removeItem(OAUTH_FLASH_LOOPBACK_KEY);
    if (!msg) return null;
    return loop ? { message: msg, loopbackUrl: loop } : { message: msg };
  } catch {
    return null;
  }
}

function stripSpotifyOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('state')) return;
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

/** Finish Spotify PKCE redirect when `code` and `state` are on the query string. */
export async function tryCompleteSpotifyOAuthFromUrl(): Promise<void> {
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim();
  if (!clientId) return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return;
  const expected = sessionStorage.getItem('encore_spotify_oauth_state');
  if (!expected || state !== expected) {
    try {
      sessionStorage.removeItem('encore_spotify_oauth_state');
    } catch {
      /* ignore */
    }
    stripSpotifyOAuthParamsFromUrl();
    try {
      sessionStorage.setItem(
        OAUTH_FLASH_ERROR_KEY,
        'Spotify sign-in could not be verified (missing or mismatched session). Use Connect Spotify on the same browser tab and origin you started from.',
      );
      const loop = typeof window !== 'undefined' ? encoreLoopbackUrlFromCurrent() : '';
      if (loop) sessionStorage.setItem(OAUTH_FLASH_LOOPBACK_KEY, loop);
    } catch {
      /* ignore */
    }
    return;
  }
  sessionStorage.removeItem('encore_spotify_oauth_state');
  const verifier = consumePkceVerifier();
  if (!verifier) {
    stripSpotifyOAuthParamsFromUrl();
    try {
      sessionStorage.setItem(
        OAUTH_FLASH_ERROR_KEY,
        'Spotify sign-in expired or was interrupted. Tap Connect Spotify and try again.',
      );
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const bundle = await exchangeSpotifyCode({
      clientId,
      redirectUri: getSpotifyRedirectUri(),
      code,
      verifier,
    });
    storeSpotifyToken(bundle);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      sessionStorage.setItem(OAUTH_FLASH_ERROR_KEY, message);
    } catch {
      /* ignore */
    }
    console.error('Encore Spotify token exchange failed', e);
  } finally {
    stripSpotifyOAuthParamsFromUrl();
  }
}
