import { encoreDb } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';

/**
 * Song/performance delete tombstones (P0 sync data-loss fix).
 *
 * The monolithic repertoire merge unions songs and performances by id (see
 * `mergeSongRecords` / `mergePerformanceRecords`). Without a tombstone, a delete on device A is
 * resurrected: device B still holds the row, the next pull unions it back, and B re-pushes it, so
 * the purge never sticks. These helpers record deleted ids in `repertoireExtras` (persisted to
 * Drive with the rest of the extras envelope) and the merge filters them out — mirroring the
 * exercise-run tombstones in `encoreExerciseRunTombstones.ts`.
 *
 * Undo-awareness: restoring a row (undo of a delete, or redo of a create) must CLEAR its tombstone
 * so the restored row is not filtered out on the next merge. Delete paths call `record*`; restore
 * paths call `clear*`.
 */

const MAX_DELETED_ROW_TOMBSTONES = 1000;

function unionCapped(existing: string[] | undefined, add: readonly string[]): string[] {
  const merged = [...new Set([...(existing ?? []), ...add])];
  return merged.slice(-MAX_DELETED_ROW_TOMBSTONES);
}

function normalizeIds(ids: readonly string[]): string[] {
  return ids.map((id) => id.trim()).filter(Boolean);
}

type RepertoireTombstoneField = 'deletedSongIds' | 'deletedPerformanceIds';

async function mutateTombstones(
  field: RepertoireTombstoneField,
  ids: readonly string[],
  mode: 'add' | 'remove',
): Promise<void> {
  const trimmed = normalizeIds(ids);
  if (!trimmed.length) return;
  const now = new Date().toISOString();
  const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  const current = extras[field] ?? [];
  let next: string[];
  if (mode === 'add') {
    next = unionCapped(current, trimmed);
  } else {
    const removed = new Set(trimmed);
    next = current.filter((id) => !removed.has(id));
  }
  // No-op when nothing changed — avoids churning `updatedAt` (which would trigger a needless push).
  if (next.length === current.length && next.every((id, i) => id === current[i])) return;
  await encoreDb.repertoireExtras.put({
    ...extras,
    [field]: next.length ? next : undefined,
    updatedAt: now,
  });
}

/** Record song ids the user deleted so union merge cannot resurrect them from another device. */
export async function recordDeletedSongIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedSongIds', ids, 'add');
}

/** Record performance ids the user deleted (including song-cascade deletes). */
export async function recordDeletedPerformanceIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedPerformanceIds', ids, 'add');
}

/** Clear song tombstones when the rows are restored (undo of delete / redo of create). */
export async function clearDeletedSongIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedSongIds', ids, 'remove');
}

/** Clear performance tombstones when the rows are restored. */
export async function clearDeletedPerformanceIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedPerformanceIds', ids, 'remove');
}

/** Union two tombstone id lists (used by `mergeRepertoireExtras`), capped to bound growth. */
export function unionDeletedRowIds(
  local: string[] | undefined,
  remote: string[] | undefined,
): string[] | undefined {
  const merged = [...new Set([...(local ?? []), ...(remote ?? [])])];
  if (!merged.length) return undefined;
  return merged.slice(-MAX_DELETED_ROW_TOMBSTONES);
}
