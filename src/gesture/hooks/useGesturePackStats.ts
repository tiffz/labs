import { useContext } from 'react';
import { GESTURE_PACK_COVER_COUNT } from '../drive/gesturePackIndex';
import { gesturePackStatsContext } from '../context/gesturePackStatsContext';

export type { GesturePackStats } from './useGesturePackStatsTypes';

/** Aggregates pack file counts, cover ids, and drawn sets from Dexie (shared provider). */
export function useGesturePackStats() {
  const value = useContext(gesturePackStatsContext);
  if (!value) {
    throw new Error('useGesturePackStats must be used within GesturePackStatsProvider');
  }
  return value;
}

/** Cover file ids for a collection card — prefers synced pack.coverFileIds. */
export function resolveGesturePackCoverFileIds(
  pack: { id: string; coverFileIds?: string[] },
  coverIds: Map<string, string[]>,
): string[] {
  if (pack.coverFileIds?.length) return pack.coverFileIds.slice(0, GESTURE_PACK_COVER_COUNT);
  return (coverIds.get(pack.id) ?? []).slice(0, GESTURE_PACK_COVER_COUNT);
}
