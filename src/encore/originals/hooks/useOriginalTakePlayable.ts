import { useCallback, useEffect, useMemo, useState } from 'react';
import { findLocalAudioTakeIds, originalTakeBlobKey } from '../originalTakeLocalAudio';
import {
  originalPlaybackTake,
  originalTakeHasPlayableSource,
  type EncoreOriginalSong,
  type OriginalAudioTake,
} from '../types';

export type UseOriginalTakePlayableResult = {
  /** Best take for library playback — preferred when playable, else first playable take. */
  playbackTake: OriginalAudioTake | null;
  takeIsPlayable: (take: OriginalAudioTake) => boolean;
  canPlayPlaybackTake: boolean;
};

/** Is this song's take playable here: Drive id, local-audio flag, or a saved blob. */
export type OriginalsTakeIsPlayable = (song: EncoreOriginalSong, take: OriginalAudioTake) => boolean;

/**
 * Drive/local/blob playability for every take of `songs`.
 *
 * The list needs this, not just the per-row cells: it builds the play target itself, and a
 * flag-only check there played a different take from the one the row's tooltip promised.
 */
export function useOriginalsTakeIsPlayable(
  songs: readonly EncoreOriginalSong[],
  enabled = true,
): OriginalsTakeIsPlayable {
  const [localAudioKeys, setLocalAudioKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!enabled || songs.every((s) => s.takes.length === 0)) {
      setLocalAudioKeys(new Set());
      return;
    }
    let cancelled = false;
    void Promise.all(
      songs.map(async (song) =>
        [...(await findLocalAudioTakeIds(song))].map((takeId) => originalTakeBlobKey(song.id, takeId)),
      ),
    ).then((keys) => {
      if (!cancelled) setLocalAudioKeys(new Set(keys.flat()));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, songs]);

  return useCallback(
    (song: EncoreOriginalSong, take: OriginalAudioTake) =>
      originalTakeHasPlayableSource(take) || localAudioKeys.has(originalTakeBlobKey(song.id, take.id)),
    [localAudioKeys],
  );
}

/** Resolves Drive/local/blob playability for demo takes (library + view mode). */
export function useOriginalTakePlayable(
  song: EncoreOriginalSong,
  enabled = true,
): UseOriginalTakePlayableResult {
  const songs = useMemo(() => [song], [song]);
  const songTakeIsPlayable = useOriginalsTakeIsPlayable(songs, enabled);

  const takeIsPlayable = useCallback(
    (take: OriginalAudioTake) => songTakeIsPlayable(song, take),
    [song, songTakeIsPlayable],
  );

  const playbackTake = useMemo(() => originalPlaybackTake(song, takeIsPlayable), [song, takeIsPlayable]);

  return {
    playbackTake,
    takeIsPlayable,
    canPlayPlaybackTake: playbackTake ? takeIsPlayable(playbackTake) : false,
  };
}
