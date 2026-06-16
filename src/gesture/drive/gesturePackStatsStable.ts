import type { GesturePackStatsAggregate } from '../drive/gesturePackStatsAggregate';

function mapsEqual<K, V>(
  a: Map<K, V>,
  b: Map<K, V>,
  valueEqual: (left: V, right: V) => boolean,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, left] of a) {
    const right = b.get(key);
    if (right === undefined || !valueEqual(left, right)) return false;
  }
  return true;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function coverIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function stabilizeGesturePackStatsAggregate(
  prev: GesturePackStatsAggregate | null,
  next: GesturePackStatsAggregate,
): GesturePackStatsAggregate {
  if (!prev) return next;
  if (
    prev.packFileCount === next.packFileCount &&
    prev.drawHistoryCount === next.drawHistoryCount &&
    mapsEqual(prev.counts, next.counts, (a, b) => a === b) &&
    mapsEqual(prev.coverIds, next.coverIds, coverIdsEqual) &&
    mapsEqual(prev.drawnSets, next.drawnSets, setsEqual)
  ) {
    return prev;
  }

  const counts =
    mapsEqual(prev.counts, next.counts, (a, b) => a === b) ? prev.counts : next.counts;
  const coverIds =
    mapsEqual(prev.coverIds, next.coverIds, coverIdsEqual) ? prev.coverIds : next.coverIds;
  const drawnSets =
    mapsEqual(prev.drawnSets, next.drawnSets, setsEqual) ? prev.drawnSets : next.drawnSets;

  if (counts === prev.counts && coverIds === prev.coverIds && drawnSets === prev.drawnSets) {
    return prev;
  }

  return {
    counts,
    coverIds,
    drawnSets,
    packFileCount: next.packFileCount,
    drawHistoryCount: next.drawHistoryCount,
  };
}
