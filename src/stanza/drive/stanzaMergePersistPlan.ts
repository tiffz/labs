/**
 * stanzaMergePersistPlan — decide what a Drive merge is allowed to write back.
 *
 * A Stanza Drive pull is a read-modify-write with a wide gap in the middle. The harness reads the
 * library (`readLocalPayload`), then writes a pre-merge undo snapshot — a full pass over every row
 * including audio blobs — then merges, and only then persists. The user keeps using the app for
 * that whole stretch.
 *
 * The persist step used to trust the merge result as the complete state of the library:
 *
 *     for (const row of await songs.toArray()) if (!keep.has(row.id)) await songs.delete(row.id);
 *     for (const r of nextRows) await songs.put(r);
 *
 * Both halves lose data written during the gap:
 *
 *   1. A row created after the snapshot is not in `nextRows`, so the sweep DELETES it. Opening
 *      `/stanza/?v=<id>` mints exactly such a row at mount (`ensureYoutubeSongByVideoId`), which
 *      is why a YouTube song opened by link could vanish along with the sections just added to it.
 *   2. A row edited after the snapshot is overwritten by the stale merged copy, silently reverting
 *      the edit.
 *
 * The rule this module encodes: **a merge may only decide the fate of rows it actually saw.**
 * Anything else is concurrent work and must survive. Kept pure so the policy is testable without
 * Dexie; the transaction lives in `useStanzaDriveBackup`.
 */

import type { StanzaSong } from '../db/stanzaDb';
import { mergeStanzaRicherSongMetadata } from '../utils/stanzaSongMetadataMerge';

export interface StanzaMergePersistPlan {
  /** Row ids to delete — only ever rows the merge considered and dropped. */
  deleteIds: string[];
  /** Rows to write, with concurrent edits folded back in. */
  puts: StanzaSong[];
  /** Ids kept only because they appeared after the merge's snapshot (for logging/tests). */
  preservedUnseenIds: string[];
  /** Ids whose live row was newer than the snapshot and had to be re-merged. */
  remergedIds: string[];
}

export function planStanzaMergePersist(opts: {
  /** Rows currently in Dexie, read inside the write transaction. */
  live: readonly StanzaSong[];
  /** The merge result. */
  nextRows: readonly StanzaSong[];
  /**
   * The rows the merge actually saw. Required: without it there is no way to tell a row the merge
   * deliberately dropped from one that simply did not exist yet, and guessing costs a song.
   */
  basedOn: readonly StanzaSong[];
}): StanzaMergePersistPlan {
  const keep = new Set(opts.nextRows.map((r) => r.id));
  const basisById = new Map(opts.basedOn.map((r) => [r.id, r]));
  const liveById = new Map(opts.live.map((r) => [r.id, r]));

  const deleteIds: string[] = [];
  const preservedUnseenIds: string[] = [];
  for (const row of opts.live) {
    if (keep.has(row.id)) continue;
    if (!basisById.has(row.id)) {
      // Created during the merge. The merge never had an opinion about it, so it is not a
      // deletion — it is concurrent work.
      preservedUnseenIds.push(row.id);
      continue;
    }
    deleteIds.push(row.id);
  }

  const puts: StanzaSong[] = [];
  const remergedIds: string[] = [];
  for (const next of opts.nextRows) {
    const live = liveById.get(next.id);
    const basis = basisById.get(next.id);
    if (live && basis && live.updatedAt > basis.updatedAt) {
      // Edited during the merge. Fold the live row in rather than reverting it — same policy the
      // Drive merge itself uses, so markers/tombstones resolve identically.
      puts.push(mergeStanzaRicherSongMetadata(live, next));
      remergedIds.push(next.id);
      continue;
    }
    puts.push(next);
  }

  return { deleteIds, puts, preservedUnseenIds, remergedIds };
}
