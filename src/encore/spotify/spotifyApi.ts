import { ensureSpotifyAccessToken, readSpotifyToken } from './pkce';
import { spotifyGrantedScopesSufficientForPlaylistImport } from './spotifyScopes';

function spotifyPlaylistTracksErrorMessage(status: number, bodyText: string): string {
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 200);
  const base = `Spotify playlist ${status}${snippet ? `: ${snippet}` : ''}`;
  if (status === 403) {
    return (
      `${base}. ` +
      'Spotify refused access to this playlist. If it is someone else’s private list, make it public in Spotify (or sign into Encore with the Spotify account that owns it). ' +
      'If it is yours, try Disconnect Spotify in the Encore header, then sign in again so Encore receives the playlist-read scopes.'
    );
  }
  if (status === 404) {
    return `${base}. Check the playlist URL or id.`;
  }
  return base;
}

async function spotifyGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify API ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface SpotifySearchTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string; height: number }> };
}

export interface SpotifyPlaylistTrackRow {
  trackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
}

/** Paginates playlist tracks (requires playlist OAuth scopes). */
export async function fetchSpotifyPlaylistTracks(
  clientId: string,
  playlistId: string,
): Promise<SpotifyPlaylistTrackRow[]> {
  const bundle = readSpotifyToken();
  if (bundle && !spotifyGrantedScopesSufficientForPlaylistImport(bundle.scope)) {
    throw new Error(
      'Spotify is connected but this session is missing playlist-read scopes. Disconnect Spotify in the Encore header, sign in again with Spotify, and approve playlist access on the consent screen.',
    );
  }
  const token = await ensureSpotifyAccessToken(clientId);
  if (!token) throw new Error('Connect Spotify first (use 127.0.0.1 in dev per README).');
  const out: SpotifyPlaylistTrackRow[] = [];
  let url: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(spotifyPlaylistTracksErrorMessage(res.status, t));
    }
    const data = (await res.json()) as {
      items?: Array<{ track: SpotifySearchTrack | null }>;
      next?: string | null;
    };
    for (const it of data.items ?? []) {
      const tr = it.track;
      if (!tr?.id) continue;
      out.push({
        trackId: tr.id,
        title: tr.name?.trim() || 'Untitled',
        artist: tr.artists?.map((a) => a.name).join(', ').trim() || 'Unknown artist',
        albumArtUrl: tr.album?.images?.[0]?.url,
      });
    }
    url = data.next ?? null;
  }
  return out;
}

export async function searchTracks(
  token: string,
  query: string,
  limit = 8
): Promise<SpotifySearchTrack[]> {
  const q = encodeURIComponent(query);
  const data = await spotifyGet<{ tracks?: { items: SpotifySearchTrack[] } }>(
    `/search?q=${q}&type=track&limit=${limit}`,
    token
  );
  return data.tracks?.items ?? [];
}

export interface AudioFeatures {
  tempo: number;
  key: number;
  mode: number;
}

export async function getAudioFeatures(token: string, trackId: string): Promise<AudioFeatures> {
  return spotifyGet<AudioFeatures>(`/audio-features/${encodeURIComponent(trackId)}`, token);
}

const KEY_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;

export function spotifyKeyToName(key: number, mode: number): string {
  if (key < 0 || key > 11) return '';
  const base = KEY_NAMES[key] ?? '';
  return mode === 1 ? `${base} major` : `${base} minor`;
}
