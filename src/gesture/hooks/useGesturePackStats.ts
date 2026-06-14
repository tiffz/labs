import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { GESTURE_PACK_COVER_COUNT, pickGesturePackCoverFileIds } from '../drive/gesturePackIndex';
import { gestureDb } from '../db/gestureDb';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from './gestureLiveQueryEmpty';

export type GesturePackStats = {
  counts: Map<string, number>;
  /** Up to four cover file ids per pack — for cards when pack.coverFileIds is unset. */
  coverIds: Map<string, string[]>;
  drawnSets: Map<string, Set<string>>;
  /** True after packFiles and drawHistory live queries have each resolved once. */
  statsHydrated: boolean;
};

/** Aggregates pack file counts, cover ids, and drawn sets from Dexie. */
export function useGesturePackStats(): GesturePackStats {
  const packFilesRaw = useLiveQuery(() => gestureDb.packFiles.toArray(), [], undefined);
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const { value: packFiles, hydrated: packFilesHydrated } = resolveDexieLiveQuery(
    packFilesRaw,
    GESTURE_EMPTY_PACK_FILES,
  );
  const { value: drawHistory, hydrated: drawHistoryHydrated } = resolveDexieLiveQuery(
    drawHistoryRaw,
    GESTURE_EMPTY_DRAW_HISTORY,
  );

  const aggregates = useMemo(() => {
    const counts = new Map<string, number>();
    const coverIds = new Map<string, string[]>();
    const drawnSets = new Map<string, Set<string>>();
    const filesByPack = new Map<string, typeof packFiles>();
    for (const f of packFiles) {
      counts.set(f.packId, (counts.get(f.packId) ?? 0) + 1);
      const list = filesByPack.get(f.packId) ?? [];
      list.push(f);
      filesByPack.set(f.packId, list);
    }
    for (const [packId, files] of filesByPack) {
      coverIds.set(packId, pickGesturePackCoverFileIds(files));
    }
    for (const row of drawHistory) {
      const set = drawnSets.get(row.packId) ?? new Set<string>();
      set.add(row.driveFileId);
      drawnSets.set(row.packId, set);
    }
    return { counts, coverIds, drawnSets };
  }, [drawHistory, packFiles]);

  return {
    ...aggregates,
    statsHydrated: packFilesHydrated && drawHistoryHydrated,
  };
}

/** Cover file ids for a collection card — prefers synced pack.coverFileIds. */
export function resolveGesturePackCoverFileIds(
  pack: { id: string; coverFileIds?: string[] },
  coverIds: Map<string, string[]>,
): string[] {
  if (pack.coverFileIds?.length) return pack.coverFileIds.slice(0, GESTURE_PACK_COVER_COUNT);
  return (coverIds.get(pack.id) ?? []).slice(0, GESTURE_PACK_COVER_COUNT);
}
