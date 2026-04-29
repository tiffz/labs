/** Space-separated scopes for Encore Spotify OAuth (PKCE). */
export const ENCORE_SPOTIFY_SCOPES = ['playlist-read-private', 'playlist-read-collaborative'].join(' ');

const REQUIRED_PLAYLIST_IMPORT_SCOPES = ENCORE_SPOTIFY_SCOPES.split(/\s+/).filter(Boolean);

/**
 * True when Spotify returned a `scope` string that includes everything Encore needs for playlist import.
 * `undefined` / empty means we never stored scopes (older sessions): callers may still try the API.
 */
export function spotifyGrantedScopesSufficientForPlaylistImport(granted: string | undefined): boolean {
  if (granted == null || granted.trim() === '') return true;
  const g = new Set(granted.split(/\s+/).filter(Boolean));
  return REQUIRED_PLAYLIST_IMPORT_SCOPES.every((s) => g.has(s));
}
