/** Space-separated scopes for Encore Spotify OAuth (PKCE). */
export const ENCORE_SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

const REQUIRED_PLAYLIST_IMPORT_SCOPES = ['playlist-read-private', 'playlist-read-collaborative'] as const;

/**
 * True when Spotify returned a `scope` string that includes everything Encore needs for playlist import.
 * `undefined` / empty means we never stored scopes (older sessions): callers may still try the API.
 */
export function spotifyGrantedScopesSufficientForPlaylistImport(granted: string | undefined): boolean {
  if (granted == null || granted.trim() === '') return true;
  const g = new Set(granted.split(/\s+/).filter(Boolean));
  return REQUIRED_PLAYLIST_IMPORT_SCOPES.every((s) => g.has(s));
}

const REQUIRED_PLAYLIST_MODIFY_SCOPES = ['playlist-modify-public', 'playlist-modify-private'] as const;

/** Needs reconnect if scopes string is present but modify scopes are missing (Practice playlist push). */
export function spotifyGrantedScopesSufficientForPlaylistModify(granted: string | undefined): boolean {
  if (granted == null || granted.trim() === '') return true;
  const g = new Set(granted.split(/\s+/).filter(Boolean));
  return REQUIRED_PLAYLIST_MODIFY_SCOPES.every((s) => g.has(s));
}
