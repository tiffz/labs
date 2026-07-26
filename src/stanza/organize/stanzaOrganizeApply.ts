/**
 * stanzaOrganizeApply — the thin, side-effectful applier for an Organize merge plan.
 *
 * The risky decisions live in the PURE `planStanzaOrganizeMerge`; this module only executes a plan:
 *   1. Write a durable `pre-merge` Drive undo snapshot (metadata layer).
 *   2. Capture the affected rows/takes so the caller can wire in-session `useLabsUndo` (Cmd/Ctrl-Z).
 *   3. Apply all writes in ONE Dexie `rw` transaction: delete dropped rows, put merged survivors,
 *      remap same-source `takes.songId`, delete cross-source takes, remap `stanzaLastSelectedSongId`.
 *   4. Write deletion tombstones for discarded sources (Drive file / YouTube / keyless-local id).
 *
 * See ADR 0027. Cross-source merges drop the donor's segment-keyed practice data by design; the
 * preview states this before the user confirms.
 */

import { stanzaDb, type StanzaTake } from '../db/stanzaDb';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from '../db/stanzaLastSelectedSong';
import { buildStanzaDriveEnvelope } from '../drive/stanzaDriveEnvelope';
import {
  addStanzaDriveTombstone,
  clearStanzaDriveTombstone,
  getStanzaDriveTombstoneFileIds,
} from '../drive/stanzaDriveTombstones';
import {
  addStanzaLocalSongTombstone,
  clearStanzaLocalSongTombstone,
  getStanzaLocalSongTombstoneIds,
} from '../drive/stanzaLocalSongTombstones';
import { pushStanzaDriveUndoSnapshot } from '../drive/stanzaDriveUndoSnapshots';
import {
  addStanzaYoutubeTombstone,
  clearStanzaYoutubeTombstone,
  getStanzaYoutubeTombstoneVideoIds,
} from '../drive/stanzaYoutubeTombstones';
import {
  planStanzaOrganizeMerge,
  type StanzaOrganizeMergePlan,
  type StanzaOrganizeRefusal,
  type StanzaOrganizeSelection,
  type StanzaOrganizeTombstones,
} from './stanzaOrganizeMerge';

export interface StanzaOrganizeApplyReport {
  mergedGroups: number;
  droppedRows: number;
  takesRemapped: number;
  takesDropped: number;
  refusals: StanzaOrganizeRefusal[];
  tombstones: StanzaOrganizeTombstones;
  /**
   * False when a deletion tombstone did not persist (e.g. localStorage quota). A dropped row with
   * no tombstone can resurrect on the next Drive pull, so the caller should warn the user to retry
   * rather than treat the merge as fully safe.
   */
  tombstonesPersisted: boolean;
}

export interface StanzaOrganizeApplyResult {
  report: StanzaOrganizeApplyReport;
  /** Restore the pre-merge library (in-session Cmd/Ctrl-Z). */
  undo: () => Promise<void>;
  /** Re-apply the merge after an undo. */
  redo: () => Promise<void>;
}

function affectedSongIds(plan: StanzaOrganizeMergePlan): string[] {
  return [...new Set([...plan.droppedRowIds, ...plan.mergedRows.map((r) => r.id)])];
}

async function readTakesForSongIds(songIds: readonly string[]): Promise<StanzaTake[]> {
  if (songIds.length === 0) return [];
  const out: StanzaTake[] = [];
  for (const id of songIds) {
    out.push(...(await stanzaDb.takes.where('songId').equals(id).toArray()));
  }
  return out;
}

async function applyPlanWrites(plan: StanzaOrganizeMergePlan): Promise<{
  takesRemapped: number;
  takesDropped: number;
}> {
  let takesRemapped = 0;
  let takesDropped = 0;
  const survivingIds = new Set(plan.mergedRows.map((r) => r.id));

  await stanzaDb.transaction('rw', stanzaDb.songs, stanzaDb.takes, async () => {
    for (const id of plan.droppedRowIds) {
      await stanzaDb.songs.delete(id);
    }
    for (const row of plan.mergedRows) {
      await stanzaDb.songs.put(row);
    }
    for (const [oldId, newId] of plan.takeRemapIds) {
      if (!survivingIds.has(newId)) continue;
      takesRemapped += await stanzaDb.takes.where('songId').equals(oldId).modify({ songId: newId });
    }
    for (const oldId of plan.takeDropSongIds) {
      takesDropped += await stanzaDb.takes.where('songId').equals(oldId).delete();
    }
  });

  const lastSelected = readStanzaLastSelectedSongId();
  if (lastSelected && plan.remappedIds.has(lastSelected)) {
    writeStanzaLastSelectedSongId(plan.remappedIds.get(lastSelected) ?? null);
  }

  return { takesRemapped, takesDropped };
}

function writeTombstones(tombstones: StanzaOrganizeTombstones): {
  addedDriveFileIds: string[];
  addedYoutubeVideoIds: string[];
  addedLocalSongIds: string[];
  persisted: boolean;
} {
  const preDrive = getStanzaDriveTombstoneFileIds();
  const preYoutube = getStanzaYoutubeTombstoneVideoIds();
  const preLocal = getStanzaLocalSongTombstoneIds();

  const addedDriveFileIds = tombstones.driveSourceFileIds.filter((id) => !preDrive.has(id));
  const addedYoutubeVideoIds = tombstones.youtubeVideoIds.filter((id) => !preYoutube.has(id));
  const addedLocalSongIds = tombstones.localSongIds.filter((id) => !preLocal.has(id));

  for (const id of tombstones.driveSourceFileIds) addStanzaDriveTombstone(id);
  for (const id of tombstones.youtubeVideoIds) addStanzaYoutubeTombstone(id);
  for (const id of tombstones.localSongIds) addStanzaLocalSongTombstone(id);

  // Verify every intended tombstone actually persisted — the underlying stores swallow a
  // localStorage quota/private-mode failure, which would otherwise leave a dropped row with no
  // tombstone (a silent resurrection gap). Surface it instead of hiding it.
  const nowDrive = getStanzaDriveTombstoneFileIds();
  const nowYoutube = getStanzaYoutubeTombstoneVideoIds();
  const nowLocal = getStanzaLocalSongTombstoneIds();
  const persisted =
    tombstones.driveSourceFileIds.every((id) => nowDrive.has(id)) &&
    tombstones.youtubeVideoIds.every((id) => nowYoutube.has(id)) &&
    tombstones.localSongIds.every((id) => nowLocal.has(id));

  return { addedDriveFileIds, addedYoutubeVideoIds, addedLocalSongIds, persisted };
}

/**
 * Apply a set of user-confirmed Organize groups. Reads the library, plans the merge (pure), then
 * snapshots, writes, and tombstones. Returns a report plus `undo`/`redo` for `useLabsUndo`.
 *
 * `opts.snapshot === false` skips the durable Drive snapshot (tests / callers that snapshot
 * upstream). The default writes one.
 */
export async function applyStanzaOrganizeMerge(
  selections: readonly StanzaOrganizeSelection[],
  opts: { snapshot?: boolean } = {},
): Promise<StanzaOrganizeApplyResult> {
  const rows = await stanzaDb.songs.toArray();
  const plan = planStanzaOrganizeMerge(rows, selections);

  const baseReport: StanzaOrganizeApplyReport = {
    mergedGroups: 0,
    droppedRows: 0,
    takesRemapped: 0,
    takesDropped: 0,
    refusals: plan.refusals,
    tombstones: plan.tombstones,
    tombstonesPersisted: true,
  };

  // Nothing to apply (all groups refused, or empty selection) — surface refusals, do not snapshot.
  if (plan.mergedRows.length === 0) {
    return { report: baseReport, undo: async () => {}, redo: async () => {} };
  }

  if (opts.snapshot !== false) {
    const envelope = await buildStanzaDriveEnvelope();
    await pushStanzaDriveUndoSnapshot(envelope, 'pre-merge');
  }

  // Capture pre-state for in-session undo (kept in memory so blobs survive).
  const songIds = affectedSongIds(plan);
  const preRows = rows.filter((r) => songIds.includes(r.id));
  const preTakes = await readTakesForSongIds(songIds);
  const preLastSelected = readStanzaLastSelectedSongId();

  // Ordering guarantee: the destructive Dexie transaction commits, then tombstones are written
  // with NO `await` in between — deleting a row and recording its tombstone happen in one
  // synchronous continuation, so a racing Drive pull cannot observe dropped-rows-without-tombstones
  // within this tab. (Tombstones live in localStorage and cannot join the Dexie transaction, so
  // full cross-store atomicity is impossible; `writeTombstones` verifies persistence and the report
  // flags a failure.)
  const { takesRemapped, takesDropped } = await applyPlanWrites(plan);
  const added = writeTombstones(plan.tombstones);
  if (!added.persisted) {
    console.error(
      '[stanza-organize] tombstones did not persist; dropped rows may resurrect on the next Drive pull',
    );
  }

  const report: StanzaOrganizeApplyReport = {
    ...baseReport,
    mergedGroups: plan.mergedRows.length,
    droppedRows: plan.droppedRowIds.length,
    takesRemapped,
    takesDropped,
    tombstonesPersisted: added.persisted,
  };

  const undo = async (): Promise<void> => {
    await stanzaDb.transaction('rw', stanzaDb.songs, stanzaDb.takes, async () => {
      for (const id of songIds) {
        await stanzaDb.songs.delete(id);
        await stanzaDb.takes.where('songId').equals(id).delete();
      }
      for (const row of preRows) await stanzaDb.songs.put(row);
      for (const take of preTakes) await stanzaDb.takes.put(take);
    });
    writeStanzaLastSelectedSongId(preLastSelected);
    // Reverse only the tombstones this apply added, so an undo does not re-delete rows on next pull.
    for (const id of added.addedDriveFileIds) clearStanzaDriveTombstone(id);
    for (const id of added.addedYoutubeVideoIds) clearStanzaYoutubeTombstone(id);
    for (const id of added.addedLocalSongIds) clearStanzaLocalSongTombstone(id);
  };

  const redo = async (): Promise<void> => {
    await applyPlanWrites(plan);
    writeTombstones(plan.tombstones);
  };

  return { report, undo, redo };
}
