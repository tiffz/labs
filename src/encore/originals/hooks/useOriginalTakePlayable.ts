import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasOriginalTakeBlob } from '../originalTakeLocalAudio';
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

/** Resolves Drive/local/blob playability for demo takes (library + view mode). */
export function useOriginalTakePlayable(
  song: EncoreOriginalSong,
  enabled = true,
): UseOriginalTakePlayableResult {
  const [localAudioIds, setLocalAudioIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!enabled || song.takes.length === 0) {
      setLocalAudioIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const found = new Set<string>();
      await Promise.all(
        song.takes.map(async (t) => {
          if (t.hasLocalAudio || (await hasOriginalTakeBlob(song.id, t.id))) {
            found.add(t.id);
          }
        }),
      );
      if (!cancelled) setLocalAudioIds(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, song.id, song.takes]);

  const takeIsPlayable = useCallback(
    (take: OriginalAudioTake) =>
      originalTakeHasPlayableSource(take) || localAudioIds.has(take.id),
    [localAudioIds],
  );

  const playbackTake = useMemo(() => originalPlaybackTake(song, takeIsPlayable), [song, takeIsPlayable]);

  return {
    playbackTake,
    takeIsPlayable,
    canPlayPlaybackTake: playbackTake ? takeIsPlayable(playbackTake) : false,
  };
}
