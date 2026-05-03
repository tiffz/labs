import { ensureSpotifyAccessToken, readSpotifyToken } from './pkce';
import {
  spotifyGrantedScopesSufficientForPlaylistImport,
  spotifyGrantedScopesSufficientForPlaylistModify,
} from './spotifyScopes';

async function spotifyFetchRaw(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export interface SpotifyCurrentUserSummary {
  id: string;
  display_name: string | null;
  /** ISO 3166-1 alpha-2 when Spotify exposes it; used for playlist `market` when listing items. */
  country?: string;
}

export async function fetchSpotifyCurrentUserSummary(token: string): Promise<SpotifyCurrentUserSummary | null> {
  const r = await spotifyFetchRaw('https://api.spotify.com/v1/me', token);
  if (!r.ok) return null;
  try {
    const j = JSON.parse(r.text) as { id?: string; display_name?: string | null; country?: string | null };
    if (typeof j.id !== 'string' || !j.id) return null;
    const country =
      typeof j.country === 'string' && /^[a-z]{2}$/i.test(j.country) ? j.country.toUpperCase() : undefined;
    return { id: j.id, display_name: j.display_name ?? null, ...(country ? { country } : {}) };
  } catch {
    return null;
  }
}

export interface SpotifyPlaylistSummary {
  name: string | null;
  isPublic: boolean | null;
  ownerId: string;
  ownerDisplayName: string | null;
}

export async function fetchSpotifyPlaylistSummary(
  token: string,
  playlistId: string,
): Promise<SpotifyPlaylistSummary | null> {
  const q = new URLSearchParams({ fields: 'name,public,owner(id,display_name)' });
  const r = await spotifyFetchRaw(
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?${q.toString()}`,
    token,
  );
  if (!r.ok) return null;
  try {
    const j = JSON.parse(r.text) as {
      name?: string;
      public?: boolean;
      owner?: { id?: string; display_name?: string | null };
    };
    const ownerId = j.owner?.id;
    if (typeof ownerId !== 'string' || !ownerId) return null;
    return {
      name: typeof j.name === 'string' ? j.name : null,
      isPublic: typeof j.public === 'boolean' ? j.public : null,
      ownerId,
      ownerDisplayName: j.owner?.display_name ?? null,
    };
  } catch {
    return null;
  }
}

function spotifyPlaylistTracksErrorMessage(
  status: number,
  bodyText: string,
  ctx?: {
    linkedUser: SpotifyCurrentUserSummary | null;
    playlist: SpotifyPlaylistSummary | null;
  },
): string {
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 200);
  const base = `Spotify playlist ${status}${snippet ? `: ${snippet}` : ''}`;
  if (status === 403) {
    const u = ctx?.linkedUser;
    const p = ctx?.playlist;
    const who =
      u != null
        ? ` Encore is linked as Spotify "${u.display_name?.trim() || u.id}" (user id ${u.id}).`
        : ' Could not read which Spotify user is linked (try Account menu → Connect Spotify again).';
    const ownerLine =
      p != null
        ? ` Playlist "${p.name ?? 'Unknown'}" is ${p.isPublic === true ? 'public' : p.isPublic === false ? 'non-public' : 'unknown visibility'}, owner Spotify id ${p.ownerId}${p.ownerDisplayName ? ` ("${p.ownerDisplayName}")` : ''}.`
        : '';
    const mismatch =
      u != null && p != null && p.ownerId !== u.id
        ? ' The linked Spotify user is not the playlist owner: use Account menu → Connect Spotify with the owner account, or ensure the playlist is public if you expect access from this account.'
        : '';
    return (
      `${base}.${who}${ownerLine}${mismatch} ` +
      'If this is your playlist, try Account menu → Disconnect Spotify, then Connect again and accept playlist-read scopes. In Spotify Developer Dashboard (Development mode), add this Spotify login under User management for your app.'
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
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = '';
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (typeof j?.error?.message === 'string' && j.error.message.trim()) {
        detail = `: ${j.error.message.trim()}`;
      }
    } catch {
      /* ignore */
    }
    if (!detail) {
      const snip = text.replace(/\s+/g, ' ').trim().slice(0, 160);
      if (snip) detail = ` (${snip})`;
    }
    throw new Error(`Spotify API ${path}: ${res.status}${detail}`);
  }
  return res.json() as Promise<T>;
}

export interface SpotifySearchTrack {
  id: string;
  name: string;
  artists: Array<{ id?: string; name: string }>;
  album: { images: Array<{ url: string; height: number }> };
}

/** Title and primary artist line for repertoire rows (same labeling as playlist import). */
export function spotifyTrackTitleAndArtist(track: SpotifySearchTrack): { title: string; artist: string } {
  return {
    title: track.name?.trim() || 'Untitled',
    artist: track.artists?.map((a) => a.name).join(', ').trim() || 'Unknown artist',
  };
}

export interface SpotifyPlaylistTrackRow {
  trackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
}

/** Resolves track from a playlist row (`track` on legacy responses, `item` on Get Playlist Items). */
export function parseSpotifyPlaylistItemTrack(it: {
  track?: SpotifySearchTrack | null;
  item?: unknown;
}): SpotifySearchTrack | null {
  if (it.track?.id) return it.track;
  const item = it.item;
  if (!item || typeof item !== 'object') return null;
  const o = item as { type?: string; id?: string; name?: string; artists?: unknown };
  if (o.type === 'episode') return null;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.name !== 'string') return null;
  if (!Array.isArray(o.artists)) return null;
  return item as SpotifySearchTrack;
}

/** Paginates playlist tracks (requires playlist OAuth scopes). */
export async function fetchSpotifyPlaylistTracks(
  clientId: string,
  playlistId: string,
): Promise<SpotifyPlaylistTrackRow[]> {
  const bundle = readSpotifyToken();
  if (bundle && !spotifyGrantedScopesSufficientForPlaylistImport(bundle.scope)) {
    throw new Error(
      'Spotify is connected but this session is missing playlist-read scopes. Open Account menu → Disconnect Spotify, then Connect again and approve playlist access on the consent screen.',
    );
  }
  const token = await ensureSpotifyAccessToken(clientId);
  if (!token) throw new Error('Connect Spotify first.');

  const linkedUser = await fetchSpotifyCurrentUserSummary(token);
  const playlistMeta = await fetchSpotifyPlaylistSummary(token, playlistId);

  const marketQs =
    linkedUser?.country != null && linkedUser.country.length === 2
      ? `&market=${encodeURIComponent(linkedUser.country)}`
      : '';

  const acc: SpotifyPlaylistTrackRow[] = [];
  /** Use [Get Playlist Items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items) (`/items`), not legacy `/tracks`, which can return 403 for the same user. */
  let url: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50&additional_types=track%2Cepisode${marketQs}`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(spotifyPlaylistTracksErrorMessage(res.status, t, { linkedUser, playlist: playlistMeta }));
    }
    const data = (await res.json()) as {
      items?: Array<{ track?: SpotifySearchTrack | null; item?: unknown }>;
      next?: string | null;
    };
    for (const it of data.items ?? []) {
      const tr = parseSpotifyPlaylistItemTrack(it);
      if (!tr?.id) continue;
      acc.push({
        trackId: tr.id,
        title: tr.name?.trim() || 'Untitled',
        artist: tr.artists?.map((a) => a.name).join(', ').trim() || 'Unknown artist',
        albumArtUrl: tr.album?.images?.[0]?.url,
      });
    }
    url = data.next ?? null;
  }
  return acc;
}

/** Replace all tracks in a playlist (order matches `trackIds`). Requires playlist-modify OAuth scopes. */
export async function replaceSpotifyPlaylistTracks(
  clientId: string,
  playlistId: string,
  trackIds: readonly string[],
): Promise<void> {
  const bundle = readSpotifyToken();
  if (bundle && !spotifyGrantedScopesSufficientForPlaylistModify(bundle.scope)) {
    throw new Error(
      'Spotify needs permission to edit playlists. Open Account menu → Disconnect Spotify, then Connect again and approve playlist editing on the consent screen.',
    );
  }
  const token = await ensureSpotifyAccessToken(clientId);
  if (!token) throw new Error('Connect Spotify first.');

  const uris = trackIds.map((id) => `spotify:track:${id}`);
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    const snip = t.replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new Error(`Spotify could not update playlist (${res.status})${snip ? `: ${snip}` : ''}`);
  }
}

export async function fetchSpotifyTrack(token: string, trackId: string): Promise<SpotifySearchTrack> {
  return spotifyGet<SpotifySearchTrack>(`/tracks/${encodeURIComponent(trackId)}`, token);
}

/** Spotify `GET /search` allows at most 10 results per type (see Web API reference). */
const SPOTIFY_SEARCH_MAX_LIMIT = 10;

/** Very long `q` values can trigger 4xx; keep a conservative cap. */
const SPOTIFY_SEARCH_QUERY_MAX_CHARS = 200;

function collapseSpotifyWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Channels that rarely help as Spotify `artist:` hints (karaoke aggregators, etc.). */
const SPOTIFY_CHANNEL_GENERIC_RE =
  /karaoke|sing king|curtain ?up|sing2music|official ?lyrics|nightcore|8d audio|instrumental|backing track|piano accompanist/i;

function trimSpotifySearchQ(s: string): string {
  if (s.length <= SPOTIFY_SEARCH_QUERY_MAX_CHARS) return s;
  const slice = s.slice(0, SPOTIFY_SEARCH_QUERY_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 24 ? slice.slice(0, lastSpace) : slice).trim();
}

function spotifyFieldQuoted(value: string): string {
  const esc = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${esc}"`;
}

/**
 * Builds a Spotify `q` string biased toward the right track for show titles.
 * Uses `track:` / `artist:` filters when possible so free-text like
 * "On My Own Les Misérables" does not rank "Dancing On My Own" first.
 */
export function buildSpotifyTrackSearchQuery(input: {
  songTitle: string;
  artistHint?: string;
  channelTitle?: string;
}): string {
  const title = collapseSpotifyWhitespace(input.songTitle);
  let artist = collapseSpotifyWhitespace(input.artistHint ?? '');
  const channel = collapseSpotifyWhitespace(input.channelTitle ?? '');
  if (!artist && channel && !SPOTIFY_CHANNEL_GENERIC_RE.test(channel)) {
    artist = channel;
  }
  if (title.length < 2) {
    return normalizeSpotifySearchQuery([input.songTitle, input.artistHint, input.channelTitle].filter(Boolean).join(' '));
  }
  const trackClause = `track:${spotifyFieldQuoted(title)}`;
  if (artist.length >= 2 && !SPOTIFY_CHANNEL_GENERIC_RE.test(artist)) {
    return trimSpotifySearchQ(`${trackClause} artist:${spotifyFieldQuoted(artist)}`);
  }
  return trimSpotifySearchQ(trackClause);
}

function normalizeSpotifySearchQuery(raw: string): string {
  const t = raw
    .trim()
    .normalize('NFC')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= SPOTIFY_SEARCH_QUERY_MAX_CHARS) return t;
  const slice = t.slice(0, SPOTIFY_SEARCH_QUERY_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim();
}

export async function searchTracks(
  token: string,
  query: string,
  limit = 8
): Promise<SpotifySearchTrack[]> {
  const q = normalizeSpotifySearchQuery(query);
  if (!q) return [];
  const safeLimit = Math.min(SPOTIFY_SEARCH_MAX_LIMIT, Math.max(1, Math.floor(limit)));
  const params = new URLSearchParams({ q, type: 'track', limit: String(safeLimit) });
  const data = await spotifyGet<{ tracks?: { items: SpotifySearchTrack[] } }>(`/search?${params.toString()}`, token);
  return data.tracks?.items ?? [];
}

