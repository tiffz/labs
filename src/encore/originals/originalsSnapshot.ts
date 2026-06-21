import type { EncoreOriginalSong, OriginalSongSnapshot } from './types';
import { ORIGINALS_HISTORY_MAX } from './types';

/** Append a chart snapshot after idle typing; prunes oldest entries. */
export function appendOriginalChartSnapshot(
  song: EncoreOriginalSong,
  lyricsAndChords: string,
): EncoreOriginalSong {
  const snapshot: OriginalSongSnapshot = {
    timestamp: Date.now(),
    lyricsAndChords,
  };
  const last = song.history[song.history.length - 1];
  if (last?.lyricsAndChords === lyricsAndChords) return song;
  const history = [...song.history, snapshot];
  while (history.length > ORIGINALS_HISTORY_MAX) history.shift();
  return { ...song, history };
}

/**
 * Idle history append must always carry {@link lyricsAndChords} forward.
 * Callers must not spread a stale draft body when scheduling delayed saves.
 */
export function mergeIdleChartSnapshot(
  song: EncoreOriginalSong,
  lyricsAndChords: string,
): EncoreOriginalSong | null {
  const synced = { ...song, lyricsAndChords };
  const withHist = appendOriginalChartSnapshot(synced, lyricsAndChords);
  if (withHist.history === song.history) return null;
  return withHist;
}

export function restoreOriginalFromSnapshot(
  song: EncoreOriginalSong,
  snapshot: OriginalSongSnapshot,
): EncoreOriginalSong {
  return {
    ...song,
    lyricsAndChords: snapshot.lyricsAndChords,
    updatedAt: new Date().toISOString(),
  };
}
