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

  return { addedDriveFileIds, addedYoutubeVideoIds, addedLocalSongIds };
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

  const { takesRemapped, takesDropped } = await applyPlanWrites(plan);
  const added = writeTombstones(plan.tombstones);

  const report: StanzaOrganizeApplyReport = {
    ...baseReport,
    mergedGroups: plan.mergedRows.length,
    droppedRows: plan.droppedRowIds.length,
    takesRemapped,
    takesDropped,
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
