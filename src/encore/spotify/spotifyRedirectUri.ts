/**
 * Redirect URI for Spotify OAuth (must match Spotify Dashboard exactly).
 * Must use the same origin where PKCE verifier + OAuth state live (sessionStorage).
 *
 * Spotify does not allow the hostname `localhost` in redirect URIs; use
 * `http://127.0.0.1:<port>/encore/` in the Spotify app settings and open Encore
 * at that URL when testing Spotify (see README + in-app notice).
 */
export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}/encore/`;
}

/** Same URL on IPv4 loopback (for dev). Empty string if not on localhost. */
export function encoreLoopbackUrlFromCurrent(): string {
  if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return '';
  const u = new URL(window.location.href);
  u.hostname = '127.0.0.1';
  return u.toString();
}
