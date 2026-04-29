import type { EncoreSong } from '../types';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';
import { parseYoutubeTitleForSong, parseYoutubeTitleForSongWithContext } from './parseYoutubeTitleForSong';

export { parseYoutubeTitleForSong, parseYoutubeTitleForSongWithContext };

export type ImportRowKind = 'paired' | 'spotify_only' | 'youtube_only';

export interface PlaylistImportRow {
  id: string;
  spotify?: SpotifyPlaylistTrackRow;
  youtube?: YouTubePlaylistItemRow;
  /** Selected YouTube link for this row (`null` = none). */
  youtubeVideoId: string | null;
  matchScore: number;
  kind: ImportRowKind;
  /** Optional Spotify track chosen in import review (e.g. YouTube-only rows). */
  spotifyEnrichment?: {
    spotifyTrackId: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
  };
}

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\(official[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\b(ft\.|feat\.|featuring)\b[^|,-]*/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const bg = t.slice(i, i + 2);
    if (!/\S/.test(bg[0]!) || !/\S/.test(bg[1]!)) continue;
    m.set(bg, (m.get(bg) ?? 0) + 1);
  }
  return m;
}

/** Sorensen-Dice on character bigrams (cheap fuzzy similarity). */
export function diceCoefficient(a: string, b: string): number {
  const A = normalizeForMatch(a);
  const B = normalizeForMatch(b);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  if (A === B) return 1;
  const bgA = bigrams(A);
  const bgB = bigrams(B);
  let inter = 0;
  let total = 0;
  for (const [, c] of bgA) total += c;
  for (const [, c] of bgB) total += c;
  for (const [k, cA] of bgA) {
    const cB = bgB.get(k) ?? 0;
    inter += Math.min(cA, cB);
  }
  return total > 0 ? (2 * inter) / total : 0;
}

function spotifyLabel(sp: SpotifyPlaylistTrackRow): string {
  return `${sp.artist} ${sp.title}`;
}

function youtubeLabel(yt: YouTubePlaylistItemRow): string {
  const parsed = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
  const artist = parsed.artist || yt.channelTitle;
  return `${artist} ${parsed.songTitle}`.trim();
}

export function scoreSpotifyYoutube(sp: SpotifyPlaylistTrackRow, yt: YouTubePlaylistItemRow): number {
  return diceCoefficient(spotifyLabel(sp), youtubeLabel(yt));
}

const MATCH_THRESHOLD = 0.34;

export function buildPlaylistImportRows(
  spotify: SpotifyPlaylistTrackRow[] | null,
  youtube: YouTubePlaylistItemRow[] | null,
): PlaylistImportRow[] {
  const sp = spotify ?? [];
  const yt = youtube ?? [];
  if (!sp.length && !yt.length) return [];

  if (sp.length && !yt.length) {
    return sp.map((row) => ({
      id: `sp-${row.trackId}`,
      spotify: row,
      youtubeVideoId: null,
      matchScore: 1,
      kind: 'spotify_only' as const,
    }));
  }
  if (!sp.length && yt.length) {
    return yt.map((row) => ({
      id: `yt-${row.videoId}`,
      youtube: row,
      youtubeVideoId: row.videoId,
      matchScore: 1,
      kind: 'youtube_only' as const,
    }));
  }

  const pairs: Array<{ si: number; yi: number; score: number }> = [];
  for (let si = 0; si < sp.length; si++) {
    for (let yi = 0; yi < yt.length; yi++) {
      pairs.push({ si, yi, score: scoreSpotifyYoutube(sp[si]!, yt[yi]!) });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const usedYi = new Set<number>();
  const spotToYt = new Map<number, { yi: number; score: number }>();
  for (const p of pairs) {
    if (p.score < MATCH_THRESHOLD) break;
    if (spotToYt.has(p.si) || usedYi.has(p.yi)) continue;
    spotToYt.set(p.si, { yi: p.yi, score: p.score });
    usedYi.add(p.yi);
  }

  const rows: PlaylistImportRow[] = [];
  for (let si = 0; si < sp.length; si++) {
    const m = spotToYt.get(si);
    const srow = sp[si]!;
    if (m) {
      const yrow = yt[m.yi]!;
      rows.push({
        id: `pair-${srow.trackId}-${yrow.videoId}`,
        spotify: srow,
        youtube: yrow,
        youtubeVideoId: yrow.videoId,
        matchScore: m.score,
        kind: 'paired',
      });
    } else {
      rows.push({
        id: `sp-${srow.trackId}`,
        spotify: srow,
        youtubeVideoId: null,
        matchScore: 0,
        kind: 'spotify_only',
      });
    }
  }
  for (let yi = 0; yi < yt.length; yi++) {
    if (usedYi.has(yi)) continue;
    const yrow = yt[yi]!;
    rows.push({
      id: `yt-${yrow.videoId}`,
      youtube: yrow,
      youtubeVideoId: yrow.videoId,
      matchScore: 0,
      kind: 'youtube_only',
    });
  }
  return rows;
}

export function encoreSongFromImportRow(row: PlaylistImportRow): EncoreSong | null {
  const now = new Date().toISOString();
  if (row.spotify) {
    return {
      id: crypto.randomUUID(),
      title: row.spotify.title,
      artist: row.spotify.artist,
      spotifyTrackId: row.spotify.trackId,
      albumArtUrl: row.spotify.albumArtUrl,
      youtubeVideoId: row.youtubeVideoId ?? undefined,
      journalMarkdown: '',
      createdAt: now,
      updatedAt: now,
    };
  }
  const vid = row.youtubeVideoId;
  if (!vid) return null;
  const yt = row.youtube;
  if (!yt) return null;
  if (row.spotifyEnrichment) {
    const se = row.spotifyEnrichment;
    return {
      id: crypto.randomUUID(),
      title: se.title,
      artist: se.artist,
      spotifyTrackId: se.spotifyTrackId,
      albumArtUrl: se.albumArtUrl,
      youtubeVideoId: vid,
      journalMarkdown: '',
      createdAt: now,
      updatedAt: now,
    };
  }
  const parsed = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
  return {
    id: crypto.randomUUID(),
    title: parsed.songTitle || yt.title || 'Untitled',
    artist: parsed.artist || yt.channelTitle || 'Unknown artist',
    youtubeVideoId: vid,
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}
