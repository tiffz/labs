import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import type { DerivedSegment } from '../utils/segments';
import { findSegmentIndexAtTime } from '../utils/segments';
import {
  mergeStanzaPracticeStatsPatch,
  STANZA_PRACTICE_STATS_FLUSH_MS,
  STANZA_PRACTICE_STATS_TICK_MS,
  type StanzaPracticeStatsPending,
} from '../utils/stanzaPracticeStatsAccumulator';

type PersistSong = (
  patch: Partial<StanzaSong> & Pick<StanzaSong, 'id'>,
  opts?: { recordUndo?: boolean; touchUpdatedAt?: boolean },
) => Promise<void>;

export type UseStanzaPracticeStatsTrackerOpts = {
  songId: string | undefined;
  isPlaying: boolean;
  segmentsRef: MutableRefObject<DerivedSegment[]>;
  playingRef: MutableRefObject<boolean>;
  timeRef: MutableRefObject<number>;
  persistSong: PersistSong;
};

/**
 * Accumulates per-section practice time in memory and flushes to IndexedDB periodically.
 *
 * Avoids a Dexie write + full library `useLiveQuery` refresh every second during playback
 * (a common mobile stability issue during long loop sessions).
 */
export function useStanzaPracticeStatsTracker(opts: UseStanzaPracticeStatsTrackerOpts): void {
  const { songId, isPlaying, segmentsRef, playingRef, timeRef, persistSong } = opts;
  const pendingRef = useRef<StanzaPracticeStatsPending>(new Map());
  const flushInFlightRef = useRef(false);

  const flush = useCallback(async () => {
    const id = songId;
    if (!id || flushInFlightRef.current) return;
    const pending = pendingRef.current;
    if (pending.size === 0) return;

    const batch = new Map(pending);
    pending.clear();
    flushInFlightRef.current = true;
    try {
      const row = await stanzaDb.songs.get(id);
      if (!row) return;
      const stats = mergeStanzaPracticeStatsPatch(row.stats, batch);
      await persistSong({ id, stats }, { recordUndo: false, touchUpdatedAt: false });
    } catch (err) {
      for (const [segId, ms] of batch) {
        pending.set(segId, (pending.get(segId) ?? 0) + ms);
      }
      console.warn('[stanza] practice stats flush failed', err);
    } finally {
      flushInFlightRef.current = false;
    }
  }, [persistSong, songId]);

  useEffect(() => {
    if (!songId) return;

    const tickId = window.setInterval(() => {
      if (!document.hasFocus()) return;
      if (!playingRef.current) return;
      const idx = findSegmentIndexAtTime(segmentsRef.current, timeRef.current);
      if (idx == null) return;
      const seg = segmentsRef.current[idx];
      if (!seg) return;
      const pending = pendingRef.current;
      pending.set(seg.id, (pending.get(seg.id) ?? 0) + STANZA_PRACTICE_STATS_TICK_MS);
    }, STANZA_PRACTICE_STATS_TICK_MS);

    const flushId = window.setInterval(() => {
      void flush();
    }, STANZA_PRACTICE_STATS_FLUSH_MS);

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(flushId);
      void flush();
      pendingRef.current = new Map();
    };
  }, [flush, playingRef, segmentsRef, songId, timeRef]);

  useEffect(() => {
    if (!isPlaying) void flush();
  }, [flush, isPlaying]);
}
