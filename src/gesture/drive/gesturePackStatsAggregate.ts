import { GESTURE_PACK_COVER_COUNT, pickGesturePackCoverFileIds } from './gesturePackIndex';
import { gestureDb } from '../db/gestureDb';
import type { GesturePackFile } from '../types';

export type GesturePackStatsAggregate = {
  counts: Map<string, number>;
  coverIds: Map<string, string[]>;
  drawnSets: Map<string, Set<string>>;
  packFileCount: number;
  drawHistoryCount: number;
};

const coverSort = (a: GesturePackFile, b: GesturePackFile) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Keep at most `limit` lexicographically smallest names for cover selection. */
function pushCoverCandidate(
  byPack: Map<string, GesturePackFile[]>,
  file: GesturePackFile,
  limit: number,
): void {
  const list = byPack.get(file.packId) ?? [];
  if (list.length < limit) {
    list.push(file);
    if (list.length === limit) list.sort(coverSort);
    byPack.set(file.packId, list);
    return;
  }
  const worst = list[list.length - 1]!;
  if (coverSort(file, worst) >= 0) return;
  list[list.length - 1] = file;
  list.sort(coverSort);
}

/**
 * Stream packFiles + drawHistory from Dexie without loading full tables into memory.
 * Used by the shared pack-stats provider (Collections + Practice grids).
 */
export async function loadGesturePackStatsAggregate(): Promise<GesturePackStatsAggregate> {
  const counts = new Map<string, number>();
  const coverCandidates = new Map<string, GesturePackFile[]>();
  let packFileCount = 0;

  await gestureDb.packFiles.each((file) => {
    packFileCount += 1;
    counts.set(file.packId, (counts.get(file.packId) ?? 0) + 1);
    pushCoverCandidate(coverCandidates, file, GESTURE_PACK_COVER_COUNT);
  });

  const coverIds = new Map<string, string[]>();
  for (const [packId, files] of coverCandidates) {
    coverIds.set(packId, pickGesturePackCoverFileIds(files));
  }

  const drawnSets = new Map<string, Set<string>>();
  let drawHistoryCount = 0;
  await gestureDb.drawHistory.each((row) => {
    drawHistoryCount += 1;
    const set = drawnSets.get(row.packId) ?? new Set<string>();
    set.add(row.driveFileId);
    drawnSets.set(row.packId, set);
  });

  return { counts, coverIds, drawnSets, packFileCount, drawHistoryCount };
}
