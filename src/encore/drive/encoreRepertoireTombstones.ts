import { encoreDb } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';

/**
 * Song/performance delete tombstones with a per-id clock (P0 sync data-loss fix + B1 cross-device
 * undo fix).
 *
 * The monolithic repertoire merge unions songs/performances by id, so without a tombstone a delete
 * on device A is resurrected by device B's copy. The tombstone filters that copy out. But an
 * **id-only** tombstone unioned across devices forever cannot express an *undo*: once B pulls the
 * tombstone it filters `s1` even after A restores it, silently losing the restored row on peers.
 *
 * The fix is a clock: each tombstone is `id -> deletedAt` (ISO). The merge filter drops a row only
 * when `deletedAt >= row.updatedAt` — so a row restored (or re-edited) with a **newer** `updatedAt`
 * supersedes its tombstone and survives on every device, while a genuinely-deleted stale copy
 * (older `updatedAt`) stays filtered. Undo-of-delete bumps the restored row's `updatedAt` so it
 * wins this comparison (see `EncoreActionsContext`). Union keeps the **latest** `deletedAt` per id.
 *
 * This is not a full CRDT (concurrent delete-vs-edit still resolves by wall clock; the op-log engine
 * remains deferred — TECH_DEBT_ROADMAP item 11), but it closes the delete/undo resurrection class.
 */

export type RepertoireTombstones = Record<string, string>;

const MAX_DELETED_ROW_TOMBSTONES = 1000;

/** Cap a tombstone map to the most recently-deleted ids (bounds unbounded growth). */
function capTombstones(map: RepertoireTombstones): RepertoireTombstones {
  const entries = Object.entries(map);
  if (entries.length <= MAX_DELETED_ROW_TOMBSTONES) return map;
  entries.sort((a, b) => a[1].localeCompare(b[1])); // oldest deletedAt first
  return Object.fromEntries(entries.slice(-MAX_DELETED_ROW_TOMBSTONES));
}

function normalizeIds(ids: readonly string[]): string[] {
  return ids.map((id) => id.trim()).filter(Boolean);
}

type RepertoireTombstoneField = 'deletedSongIds' | 'deletedPerformanceIds';

async function mutateTombstones(
  field: RepertoireTombstoneField,
  ids: readonly string[],
  mode: 'add' | 'remove',
  at: string,
): Promise<void> {
  const trimmed = normalizeIds(ids);
  if (!trimmed.length) return;
  const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(at);
  const current: RepertoireTombstones = { ...(extras[field] ?? {}) };
  let changed = false;
  for (const id of trimmed) {
    if (mode === 'add') {
      if (!current[id] || at > current[id]) {
        current[id] = at; // keep the newest deletedAt if re-deleted
        changed = true;
      }
    } else if (id in current) {
      delete current[id];
      changed = true;
    }
  }
  // No-op when nothing changed — avoids churning `updatedAt` (which would trigger a needless push).
  if (!changed) return;
  const next = capTombstones(current);
  await encoreDb.repertoireExtras.put({
    ...extras,
    [field]: Object.keys(next).length ? next : undefined,
    updatedAt: at,
  });
}

/** Record song ids the user deleted (clock = now) so union merge cannot resurrect them. */
export async function recordDeletedSongIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedSongIds', ids, 'add', new Date().toISOString());
}

/** Record performance ids the user deleted (including song-cascade deletes). */
export async function recordDeletedPerformanceIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedPerformanceIds', ids, 'add', new Date().toISOString());
}

/**
 * Clear song tombstones when the rows are restored (undo of delete / redo of create). The clock
 * supersede already handles cross-device correctness; clearing keeps the origin device's tombstone
 * map from carrying an entry the row now contradicts.
 */
export async function clearDeletedSongIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedSongIds', ids, 'remove', new Date().toISOString());
}

/** Clear performance tombstones when the rows are restored. */
export async function clearDeletedPerformanceIds(ids: readonly string[]): Promise<void> {
  await mutateTombstones('deletedPerformanceIds', ids, 'remove', new Date().toISOString());
}

/** Union two tombstone maps (used by `mergeRepertoireExtras`): keep the latest `deletedAt` per id. */
export function unionDeletedRowIds(
  local: RepertoireTombstones | undefined,
  remote: RepertoireTombstones | undefined,
): RepertoireTombstones | undefined {
  if (!local && !remote) return undefined;
  const merged: RepertoireTombstones = { ...(remote ?? {}) };
  for (const [id, deletedAt] of Object.entries(local ?? {})) {
    if (!merged[id] || deletedAt > merged[id]) merged[id] = deletedAt;
  }
  const capped = capTombstones(merged);
  return Object.keys(capped).length ? capped : undefined;
}

/**
 * Filter a merged row list against a tombstone map with clock supersede: a row is dropped only when
 * it is tombstoned AND the tombstone's `deletedAt` is at or newer than the row's `updatedAt`. A row
 * restored/edited after its delete (newer `updatedAt`) is kept.
 */
export function filterTombstonedRows<T extends { id: string; updatedAt: string }>(
  rows: T[],
  tombstones: RepertoireTombstones | undefined,
): T[] {
  if (!tombstones || Object.keys(tombstones).length === 0) return rows;
  return rows.filter((row) => {
    const deletedAt = tombstones[row.id];
    return !(deletedAt !== undefined && deletedAt >= row.updatedAt);
  });
}

/** Parse an unknown value into a tombstone map, accepting the legacy `string[]` form. */
export function parseTombstones(raw: unknown, legacyDeletedAt: string): RepertoireTombstones | undefined {
  if (Array.isArray(raw)) {
    // Legacy id-only array (pre-clock): assign a shared deletedAt so old tombstones still filter
    // rows older than the wire that carried them.
    const out: RepertoireTombstones = {};
    for (const v of raw) {
      if (typeof v === 'string' && v.trim()) out[v.trim()] = legacyDeletedAt;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (raw && typeof raw === 'object') {
    const out: RepertoireTombstones = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (k.trim() && typeof v === 'string' && v.trim()) out[k.trim()] = v.trim();
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}
