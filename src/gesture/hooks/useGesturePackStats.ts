import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from './gestureLiveQueryEmpty';

export type GesturePackStats = {
  counts: Map<string, number>;
  ids: Map<string, string[]>;
  drawnSets: Map<string, Set<string>>;
};

/** Aggregates pack file counts, Drive file ids, and drawn sets from Dexie. */
export function useGesturePackStats(): GesturePackStats {
  const packFilesRaw = useLiveQuery(() => gestureDb.packFiles.toArray(), [], undefined);
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  return useMemo(() => {
    const counts = new Map<string, number>();
    const ids = new Map<string, string[]>();
    const drawnSets = new Map<string, Set<string>>();
    for (const f of packFiles) {
      counts.set(f.packId, (counts.get(f.packId) ?? 0) + 1);
      const list = ids.get(f.packId) ?? [];
      list.push(f.driveFileId);
      ids.set(f.packId, list);
    }
    for (const row of drawHistory) {
      const set = drawnSets.get(row.packId) ?? new Set<string>();
      set.add(row.driveFileId);
      drawnSets.set(row.packId, set);
    }
    return { counts, ids, drawnSets };
  }, [drawHistory, packFiles]);
}
