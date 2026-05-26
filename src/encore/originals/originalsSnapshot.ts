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
