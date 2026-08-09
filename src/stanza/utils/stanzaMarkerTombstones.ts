import type { StanzaMarker } from '../db/stanzaDb';

/** `markerId → deletedAt` (ms). Synced with the song row via `progress.json`. */
export type StanzaMarkerTombstones = Record<string, number>;

/** Keep the map bounded; a song with thousands of dead markers is not a real case. */
export const MAX_STANZA_MARKER_TOMBSTONES = 500;

/**
 * Why marker tombstones exist.
 *
 * `mergePracticeMarkers` used to choose one side WHOLESALE by marker count, merging per-id only
 * when the counts happened to be equal. That heuristic stood in for deletion — "more markers means
 * more recent work" — and it fails in both directions:
 *
 *   - Add 2 sections on A (12) while renaming one on B (10) → B's rename is discarded entirely.
 *   - Delete 3 sections on A (9) while B still has 12 → the deletions come back on the next pull.
 *
 * The underlying `mergeStanzaMarkers` is a correct per-id union, but a union cannot express
 * deletion, which is exactly why the count proxy was bolted on top. Recording deletions explicitly
 * lets the union always run, so concurrent edits on BOTH sides survive.
 *
 * Clock supersede (same rule as the Drive/YouTube tombstones and Encore's originals sweep): a
 * marker is dropped only when its tombstone is at least as new as the `updatedAt` of the row that
 * still carries it. That makes re-adding a marker, and undoing a delete, work with no extra
 * bookkeeping — both bump `updatedAt` past the tombstone.
 */

/**
 * Diff a marker write and record ids that disappeared.
 *
 * Call at the single persist choke point rather than at each delete site: join-sections, the
 * Delete key handler, and per-marker delete all funnel through the same write, and a future
 * delete path gets tombstones for free instead of silently regressing sync.
 */
export function recordDeletedMarkerIds(opts: {
  previousMarkers: readonly StanzaMarker[] | undefined;
  nextMarkers: readonly StanzaMarker[] | undefined;
  existing: StanzaMarkerTombstones | undefined;
  now: number;
}): StanzaMarkerTombstones | undefined {
  const prev = opts.previousMarkers ?? [];
  const next = opts.nextMarkers ?? [];
  const nextIds = new Set<string>();
  for (const m of next) if (m.id) nextIds.add(m.id);

  const removed: string[] = [];
  for (const m of prev) {
    if (m.id && !nextIds.has(m.id)) removed.push(m.id);
  }

  // Re-added ids must lose their tombstone, or the merge would delete them again on the next pull.
  const revived: string[] = [];
  if (opts.existing) {
    for (const id of nextIds) if (opts.existing[id] != null) revived.push(id);
  }

  if (removed.length === 0 && revived.length === 0) return opts.existing;

  const merged: StanzaMarkerTombstones = { ...(opts.existing ?? {}) };
  for (const id of revived) delete merged[id];
  for (const id of removed) merged[id] = opts.now;

  return pruneMarkerTombstones(merged);
}

/** Newest-first, capped. */
export function pruneMarkerTombstones(
  tombstones: StanzaMarkerTombstones,
): StanzaMarkerTombstones | undefined {
  const entries = Object.entries(tombstones).filter(([, at]) => Number.isFinite(at));
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, MAX_STANZA_MARKER_TOMBSTONES));
}

/** Union two tombstone maps, keeping the newest `deletedAt` per id. */
export function mergeMarkerTombstones(
  local: StanzaMarkerTombstones | undefined,
  remote: StanzaMarkerTombstones | undefined,
): StanzaMarkerTombstones | undefined {
  if (!local && !remote) return undefined;
  const out: StanzaMarkerTombstones = { ...(local ?? {}) };
  for (const [id, at] of Object.entries(remote ?? {})) {
    const existing = out[id];
    if (existing == null || at > existing) out[id] = at;
  }
  return pruneMarkerTombstones(out);
}

/**
 * Drop markers whose tombstone supersedes the clock of every side still carrying them.
 *
 * `vouchedAt` is the `updatedAt` of the row the marker came from. A marker survives when some
 * side touched it after the delete — a genuine re-add, or an undo (which bumps `updatedAt`).
 */
export function applyMarkerTombstones(opts: {
  markers: readonly StanzaMarker[];
  tombstones: StanzaMarkerTombstones | undefined;
  vouchedAt: number;
}): StanzaMarker[] {
  const tomb = opts.tombstones;
  if (!tomb) return [...opts.markers];
  return opts.markers.filter((m) => {
    if (!m.id) return true;
    const deletedAt = tomb[m.id];
    if (deletedAt == null) return true;
    return opts.vouchedAt > deletedAt;
  });
}
