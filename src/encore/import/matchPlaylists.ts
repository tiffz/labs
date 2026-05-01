import type { EncoreMediaLink, EncoreSong } from '../types';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';
import { parseYoutubeTitleForSong, parseYoutubeTitleForSongWithContext } from './parseYoutubeTitleForSong';

export { parseYoutubeTitleForSong, parseYoutubeTitleForSongWithContext };

export type ImportRowKind = 'paired' | 'spotify_only' | 'youtube_only';

/** Present on both rows after splitting a paired Spotify–YouTube row so they can be merged again. */
export type SplitPairRef = { spotifyTrackId: string; youtubeVideoId: string };

export interface PlaylistImportRow {
  id: string;
  spotify?: SpotifyPlaylistTrackRow;
  youtube?: YouTubePlaylistItemRow;
  /** Selected YouTube link for this row (`null` = none). */
  youtubeVideoId: string | null;
  matchScore: number;
  kind: ImportRowKind;
  /** When this row came from {@link splitPairedImportRow}, use with sibling to restore a paired row. */
  splitPairRef?: SplitPairRef;
  /** Optional Spotify track chosen in import review (e.g. YouTube-only rows). */
  spotifyEnrichment?: {
    spotifyTrackId: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
  };
  /** User override: merge this import row into this library song id (skips auto-match). */
  linkedLibrarySongId?: string;
  /** When true, this row is not saved on Import. */
  skipRow?: boolean;
  /** When true, do not merge into an auto-detected library song (still honors {@link linkedLibrarySongId}). */
  ignoreAutoMatch?: boolean;
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

/** First billing name before comma (cast / composer lists dilute bigram overlap with short YouTube parses). */
function spotifyPrimaryArtist(artist: string): string {
  const t = artist.trim();
  if (!t) return '';
  return t.split(',')[0]?.trim() ?? t;
}

function spotifyLabelCompact(sp: SpotifyPlaylistTrackRow): string {
  return `${spotifyPrimaryArtist(sp.artist)} ${sp.title}`.trim();
}

function youtubeLabel(yt: YouTubePlaylistItemRow): string {
  const parsed = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
  const artist = parsed.artist || yt.channelTitle;
  return `${artist} ${parsed.songTitle}`.trim();
}

/**
 * Spotify↔YouTube pairing score. Uses the max of several views so long multi-artist Spotify lines
 * still match concise karaoke titles ("For Good", "Reflection", etc.).
 */
export function scoreSpotifyYoutube(sp: SpotifyPlaylistTrackRow, yt: YouTubePlaylistItemRow): number {
  const ytFull = youtubeLabel(yt);
  const parsed = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
  const ytSong = parsed.songTitle.trim();

  const full = diceCoefficient(spotifyLabel(sp), ytFull);
  const compact = diceCoefficient(spotifyLabelCompact(sp), ytFull);
  const titleVsFull = diceCoefficient(sp.title, ytFull);
  const titleVsSong = ytSong.length >= 2 ? diceCoefficient(sp.title, ytSong) : 0;

  return Math.max(full, compact, titleVsFull, titleVsSong);
}

/** Minimum pair score to auto-merge a Spotify row with a YouTube row (greedy one-to-one matching). */
const MATCH_THRESHOLD = 0.32;

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

/**
 * Split a paired Spotify+YouTube row into separate Spotify-only and YouTube-only rows.
 * Both produced rows share a `splitPairRef` so they can be re-merged via {@link mergeSplitPairRows}.
 * If the row is not paired (or is missing one side), it is returned unchanged.
 */
export function splitPairedImportRow(row: PlaylistImportRow): PlaylistImportRow[] {
  if (row.kind !== 'paired' || !row.spotify || !row.youtube) return [row];
  const sp = row.spotify;
  const yt = row.youtube;
  const splitPairRef: SplitPairRef = { spotifyTrackId: sp.trackId, youtubeVideoId: yt.videoId };
  const extra: Partial<PlaylistImportRow> = {
    ...(row.skipRow ? { skipRow: row.skipRow } : {}),
    ...(row.linkedLibrarySongId ? { linkedLibrarySongId: row.linkedLibrarySongId } : {}),
    ...(row.ignoreAutoMatch ? { ignoreAutoMatch: row.ignoreAutoMatch } : {}),
  };
  return [
    {
      id: `sp-${sp.trackId}`,
      spotify: sp,
      youtubeVideoId: null,
      matchScore: 0,
      kind: 'spotify_only',
      splitPairRef,
      ...extra,
    },
    {
      id: `yt-${yt.videoId}`,
      youtube: yt,
      youtubeVideoId: yt.videoId,
      matchScore: 0,
      kind: 'youtube_only',
      splitPairRef,
    },
  ];
}

/**
 * Re-merge two rows previously produced by {@link splitPairedImportRow} back into a single
 * paired row. No-op if the matching Spotify-only / YouTube-only siblings can no longer be
 * located by the `ref`.
 */
export function mergeSplitPairRows(
  rows: PlaylistImportRow[],
  ref: SplitPairRef,
): PlaylistImportRow[] {
  const spIdx = rows.findIndex(
    (r) =>
      r.kind === 'spotify_only' &&
      r.spotify?.trackId === ref.spotifyTrackId &&
      r.splitPairRef?.youtubeVideoId === ref.youtubeVideoId,
  );
  const ytIdx = rows.findIndex(
    (r) =>
      r.kind === 'youtube_only' &&
      r.youtube?.videoId === ref.youtubeVideoId &&
      r.splitPairRef?.spotifyTrackId === ref.spotifyTrackId,
  );
  if (spIdx < 0 || ytIdx < 0) return rows;
  const a = rows[spIdx]!;
  const b = rows[ytIdx]!;
  const sp = a.spotify;
  const ytResolved = b.youtube ?? a.youtube;
  if (!sp || !ytResolved) return rows;
  const skipRow = Boolean(a.skipRow || b.skipRow);
  const linkedLibrarySongId = a.linkedLibrarySongId ?? b.linkedLibrarySongId;
  const ignoreAutoMatch = a.ignoreAutoMatch || b.ignoreAutoMatch;
  const paired: PlaylistImportRow = {
    id: `pair-${sp.trackId}-${ytResolved.videoId}`,
    spotify: sp,
    youtube: ytResolved,
    youtubeVideoId: ytResolved.videoId,
    matchScore: scoreSpotifyYoutube(sp, ytResolved),
    kind: 'paired',
    ...(skipRow ? { skipRow: true } : {}),
    ...(linkedLibrarySongId ? { linkedLibrarySongId } : {}),
    ...(ignoreAutoMatch ? { ignoreAutoMatch: true } : {}),
  };
  const next = [...rows];
  const hi = Math.max(spIdx, ytIdx);
  const lo = Math.min(spIdx, ytIdx);
  next.splice(hi, 1);
  next.splice(lo, 1);
  next.splice(lo, 0, paired);
  return next;
}

export function encoreSongFromImportRow(
  row: PlaylistImportRow,
  placement: 'reference' | 'backing' = 'reference',
): EncoreSong | null {
  const now = new Date().toISOString();

  if (placement === 'backing') {
    const backingLinks: EncoreMediaLink[] = [];

    if (row.spotify) {
      const vid = row.youtubeVideoId ?? row.youtube?.videoId ?? null;
      backingLinks.push({
        id: crypto.randomUUID(),
        source: 'spotify',
        spotifyTrackId: row.spotify.trackId,
        isPrimaryBacking: true,
      });
      if (vid) {
        backingLinks.push({
          id: crypto.randomUUID(),
          source: 'youtube',
          youtubeVideoId: vid,
          youtubeKind: 'karaoke',
          isPrimaryBacking: false,
        });
      }
      return {
        id: crypto.randomUUID(),
        title: row.spotify.title,
        artist: row.spotify.artist,
        spotifyTrackId: row.spotify.trackId,
        albumArtUrl: row.spotify.albumArtUrl,
        referenceLinks: [],
        backingLinks,
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
      backingLinks.push({
        id: crypto.randomUUID(),
        source: 'spotify',
        spotifyTrackId: se.spotifyTrackId,
        isPrimaryBacking: true,
      });
      backingLinks.push({
        id: crypto.randomUUID(),
        source: 'youtube',
        youtubeVideoId: vid,
        youtubeKind: 'karaoke',
        isPrimaryBacking: false,
      });
      return {
        id: crypto.randomUUID(),
        title: se.title,
        artist: se.artist,
        spotifyTrackId: se.spotifyTrackId,
        albumArtUrl: se.albumArtUrl,
        referenceLinks: [],
        backingLinks,
        journalMarkdown: '',
        createdAt: now,
        updatedAt: now,
      };
    }

    const parsed = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
    backingLinks.push({
      id: crypto.randomUUID(),
      source: 'youtube',
      youtubeVideoId: vid,
      youtubeKind: 'karaoke',
      isPrimaryBacking: true,
    });
    return {
      id: crypto.randomUUID(),
      title: parsed.songTitle || yt.title || 'Untitled',
      artist: parsed.artist || yt.channelTitle || 'Unknown artist',
      referenceLinks: [],
      backingLinks,
      journalMarkdown: '',
      createdAt: now,
      updatedAt: now,
    };
  }

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
