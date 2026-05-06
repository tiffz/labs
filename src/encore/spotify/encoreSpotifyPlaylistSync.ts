import { encoreDb } from '../db/encoreDb';
import {
  bestImportMatch,
  IMPORT_MATCH_AUTO_MIN,
  IMPORT_MATCH_SUGGEST_MIN,
  mergeSongWithImport,
} from '../import/findExistingSongForImport';
import type { EncoreMilestoneDefinition, EncorePerformance, EncoreRepertoireSavedSearch, EncoreSong } from '../types';
import { orderSnapshotSongsByLatestPerformanceDesc } from '../drive/publicSnapshotSort';
import { filterSongsByRepertoireSavedSearchBundle } from '../repertoire/repertoireSavedSearchFilter';
import { spotifyDataSourceTrackId } from '../repertoire/songMediaLinks';
import {
  fetchSpotifyPlaylistTracks,
  replaceSpotifyPlaylistTracks,
  type SpotifyPlaylistTrackRow,
} from './spotifyApi';

export type EncorePlaylistImportSuggestRow = {
  row: SpotifyPlaylistTrackRow;
  match: EncoreSong;
  score: number;
};

/** Merge optional saved-search import tags onto a stub (deduped). */
export function encoreStubWithPlaylistImportTags(stub: EncoreSong, tags?: string[]): EncoreSong {
  if (!tags?.length) return stub;
  const merged = new Set<string>();
  for (const t of stub.tags ?? []) {
    const x = t.trim();
    if (x) merged.add(x);
  }
  for (const t of tags) {
    const x = t.trim();
    if (x) merged.add(x);
  }
  const next = [...merged];
  return next.length > 0 ? { ...stub, tags: next } : stub;
}

export function encoreSongStubFromSpotifyPlaylistRow(
  row: SpotifyPlaylistTrackRow,
  opts?: { practicing?: boolean },
): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: row.title,
    artist: row.artist,
    spotifyTrackId: row.trackId,
    albumArtUrl: row.albumArtUrl,
    journalMarkdown: '',
    practicing: opts?.practicing ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export type RunEncoreSpotifyPlaylistSyncOptions = {
  clientId: string;
  playlistId: string;
  songs: EncoreSong[];
  saveSong: (s: EncoreSong) => Promise<void>;
  setProgress: (fraction: number) => void;
  /** Built for scoring / merge; typically matches playlist import semantics (`practicing` flag only). */
  stubPracticing: boolean;
  /** Auto-merge: patch merged song before save. */
  onMergedSong: (merged: EncoreSong, now: string) => EncoreSong;
  /** Spotify track ids in playlist order after import phase succeeds. */
  getRewriteSpotifyTrackIds: () => Promise<string[]>;
  emptyRewriteMessage: string;
  /**
   * Tags applied to new/merged stubs during pull so rows stay discoverable under a saved search.
   */
  playlistImportTags?: string[];
  /**
   * `legacy`: auto-merge strong fuzzy matches (Practice-style).
   * `exactIdAutoOnly`: only auto-merge Spotify/YouTube id hits; fuzzy + new tracks require review.
   */
  reconcilePolicy?: 'legacy' | 'exactIdAutoOnly';
};

export async function runEncoreSpotifyPlaylistSync(
  opts: RunEncoreSpotifyPlaylistSyncOptions,
): Promise<
  | {
      outcome: 'review';
      suggestions: EncorePlaylistImportSuggestRow[];
      fresh: SpotifyPlaylistTrackRow[];
      playlistImportTags?: string[];
    }
  | { outcome: 'error'; message: string }
  | { outcome: 'complete' }
> {
  const {
    clientId,
    playlistId,
    songs,
    saveSong,
    setProgress,
    stubPracticing,
    onMergedSong,
    getRewriteSpotifyTrackIds,
    emptyRewriteMessage,
    playlistImportTags,
    reconcilePolicy = 'legacy',
  } = opts;

  const autoMergeMin = reconcilePolicy === 'exactIdAutoOnly' ? 1 : IMPORT_MATCH_AUTO_MIN;

  const rows = await fetchSpotifyPlaylistTracks(clientId, playlistId);
  const fresh: SpotifyPlaylistTrackRow[] = [];
  const suggestions: EncorePlaylistImportSuggestRow[] = [];
  const now = new Date().toISOString();
  const total = rows.length;
  let i = 0;
  for (const row of rows) {
    const base = encoreSongStubFromSpotifyPlaylistRow(row, { practicing: stubPracticing });
    const incoming = encoreStubWithPlaylistImportTags(base, playlistImportTags);
    const { song: match, score } = bestImportMatch(songs, incoming);
    if (score >= autoMergeMin && match) {
      const merged = mergeSongWithImport(match, incoming);
      await saveSong(onMergedSong(merged, now));
    } else if (score >= IMPORT_MATCH_SUGGEST_MIN && score < autoMergeMin && match) {
      suggestions.push({ row, match, score });
    } else {
      fresh.push(row);
    }
    i += 1;
    setProgress(total ? (i / total) * 0.55 : 0);
  }
  if (suggestions.length > 0 || fresh.length > 0) {
    return {
      outcome: 'review',
      suggestions,
      fresh,
      playlistImportTags: playlistImportTags?.length ? playlistImportTags : undefined,
    };
  }
  const ids = await getRewriteSpotifyTrackIds();
  if (ids.length === 0) {
    return { outcome: 'error', message: emptyRewriteMessage };
  }
  setProgress(0.92);
  await replaceSpotifyPlaylistTracks(clientId, playlistId, ids);
  return { outcome: 'complete' };
}

export function spotifyTrackIdsForRepertoireSavedSearch(
  saved: EncoreRepertoireSavedSearch,
  songs: EncoreSong[],
  performances: EncorePerformance[],
  perfBySong: ReadonlyMap<string, EncorePerformance[]>,
  milestoneTemplate: EncoreMilestoneDefinition[],
): string[] {
  const filtered = filterSongsByRepertoireSavedSearchBundle(
    songs,
    performances,
    perfBySong,
    milestoneTemplate,
    saved.searchQuery,
    saved.filterValues,
    saved.excludedFieldIds,
  );
  const ordered = orderSnapshotSongsByLatestPerformanceDesc(filtered, performances);
  return ordered.map((s) => spotifyDataSourceTrackId(s)).filter((x): x is string => Boolean(x));
}

/** Practicing songs with a Spotify data-source id (learning playlist rewrite). */
export async function spotifyTrackIdsForPracticingSongs(): Promise<string[]> {
  const practicingRows = await encoreDb.songs.filter((s) => Boolean(s.practicing)).toArray();
  return practicingRows.map((s) => spotifyDataSourceTrackId(s)).filter((x): x is string => Boolean(x));
}
