import { encoreDb } from '../db/encoreDb';
import {
  bestImportMatch,
  IMPORT_MATCH_AUTO_MIN,
  IMPORT_MATCH_SUGGEST_MIN,
  mergeSongWithImport,
} from '../import/findExistingSongForImport';
import type { EncoreMilestoneDefinition, EncorePerformance, EncoreRepertoireSavedSearch, EncoreSong } from '../types';
import { orderSnapshotSongsByLatestPerformanceDesc } from '../drive/publicSnapshotSort';
import { withPracticingToggle } from '../repertoire/practicingToggle';
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
  /**
   * Spotify track ids the caller saw in the playlist as of the last successful import. Enables
   * the "Spotify-side removal flows back" path: any id present here but absent from the current
   * playlist response is treated as an intentional removal — the matching local song's
   * `practicing` is flipped off and a tombstone is set. Callers that don't model practicing-state
   * (saved-search sync) should omit this parameter.
   */
  previousTrackIds?: readonly string[];
  /**
   * Called once with the current Spotify playlist track ids after the import phase, regardless
   * of whether the run ends in `review` or `complete`. Callers persist these so the next sync's
   * removal diff has the right anchor. Optional so saved-search syncs (which don't need
   * removal-detection semantics) can skip it.
   */
  onPersistLastSeenTrackIds?: (ids: readonly string[]) => Promise<void>;
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
    previousTrackIds,
    onPersistLastSeenTrackIds,
  } = opts;

  const autoMergeMin = reconcilePolicy === 'exactIdAutoOnly' ? 1 : IMPORT_MATCH_AUTO_MIN;

  const rows = await fetchSpotifyPlaylistTracks(clientId, playlistId);
  const fresh: SpotifyPlaylistTrackRow[] = [];
  const suggestions: EncorePlaylistImportSuggestRow[] = [];
  const now = new Date().toISOString();

  // Spotify-side removal detection. Any track id we saw last sync that's no longer present is
  // treated as the user (or a collaborator) intentionally dropping the song from the playlist.
  // We mirror that decision locally by tombstoning the matching `practicing: true` song; the
  // tombstone in turn keeps the song from bouncing back if it ever reappears in the playlist
  // without an affirmative re-add through the UI.
  if (previousTrackIds && previousTrackIds.length > 0) {
    const currentIdSet = new Set(rows.map((r) => r.trackId));
    const songBySpotifyId = new Map<string, EncoreSong>();
    for (const s of songs) {
      if (s.spotifyTrackId) songBySpotifyId.set(s.spotifyTrackId, s);
    }
    for (const prevId of previousTrackIds) {
      if (currentIdSet.has(prevId)) continue;
      const localSong = songBySpotifyId.get(prevId);
      // Only act when the local song is currently practicing. If it's already off, there's
      // nothing to do (and we'd be bumping `updatedAt` for no reason, which would muddy sync
      // ordering on other devices).
      if (localSong?.practicing) {
        await saveSong(withPracticingToggle(localSong, false, now));
      }
    }
  }

  const total = rows.length;
  let i = 0;
  for (const row of rows) {
    const base = encoreSongStubFromSpotifyPlaylistRow(row, { practicing: stubPracticing });
    const incoming = encoreStubWithPlaylistImportTags(base, playlistImportTags);
    const { song: match, score } = bestImportMatch(songs, incoming);
    if (score >= autoMergeMin && match) {
      const merged = mergeSongWithImport(match, incoming);
      // Honor the local "I stopped practicing this" tombstone. Without this gate, every sync
      // would force `practicing: true` back on via `onMergedSong` (which the Practice caller
      // uses to flip the flag), undoing the user's deliberate removal. We still want the
      // merge so corrected metadata (album art, title) flows in — just not the practicing flip.
      if (match.practiceRemovedAt) {
        await saveSong({ ...merged, updatedAt: now });
      } else {
        await saveSong(onMergedSong(merged, now));
      }
    } else if (score >= IMPORT_MATCH_SUGGEST_MIN && score < autoMergeMin && match) {
      suggestions.push({ row, match, score });
    } else {
      fresh.push(row);
    }
    i += 1;
    setProgress(total ? (i / total) * 0.55 : 0);
  }

  // Persist the playlist snapshot for next sync's removal diff. Runs on BOTH outcomes — if the
  // user gets a review dialog and never returns, the next sync should still know what they last
  // saw in Spotify (otherwise a track added in the meantime would look like an old, never-seen
  // track instead of a newly-added one).
  if (onPersistLastSeenTrackIds) {
    await onPersistLastSeenTrackIds(rows.map((r) => r.trackId));
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
