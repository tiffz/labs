import { useCallback } from 'react';
import type { StanzaSegmentMetronomeCalibration, StanzaSong } from '../db/stanzaDb';

export function useStanzaMetronomePersistence(
  selected: StanzaSong | undefined,
  persistSong: (
    patch: Partial<StanzaSong> & Pick<StanzaSong, 'id'>,
    opts?: { recordUndo?: boolean; touchUpdatedAt?: boolean },
  ) => Promise<void>,
) {
  const saveSegmentMetronome = useCallback(
    async (
      segmentId: string,
      cal: StanzaSegmentMetronomeCalibration,
      opts?: { recordUndo?: boolean },
    ) => {
      if (!selected) return;
      const prev = selected.metronomeBySegmentId ?? {};
      await persistSong(
        {
          id: selected.id,
          metronomeBySegmentId: { ...prev, [segmentId]: cal },
        },
        opts,
      );
    },
    [persistSong, selected],
  );

  const saveSongMetronome = useCallback(
    async (cal: StanzaSegmentMetronomeCalibration, opts?: { recordUndo?: boolean }) => {
      if (!selected) return;
      await persistSong(
        {
          id: selected.id,
          metronomeSongCalibration: cal,
        },
        opts,
      );
    },
    [persistSong, selected],
  );

  return { saveSegmentMetronome, saveSongMetronome };
}
