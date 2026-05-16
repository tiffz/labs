/**
 * stanzaConsolidateLocalLibrary — apply `consolidateStanzaSongDuplicates` to the live Dexie
 * library and remap downstream foreign keys so the user sees a single card per piece of source
 * content (one row per YouTube id / Drive file id), with audio + stems carried forward from
 * whichever device originally downloaded them.
 *
 * Two callers:
 *   1. **App startup** — runs once per session (gated by `localStorage`) so a user opening
 *      Stanza after this fix lands on a clean library instead of the side-by-side duplicates
 *      that the older `addYoutubeSong` left behind on each device.
 *   2. **Drive auto-pull** — runs after every merge so two devices that paste the same link
 *      between syncs converge to a single row instead of accreting forever.
 */

import { stanzaDb } from './stanzaDb';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from './stanzaLastSelectedSong';
import {
  consolidateStanzaSongDuplicates,
  type StanzaConsolidationResult,
} from '../utils/stanzaSongDeduplication';

const ONE_SHOT_FLAG_KEY = 'labs_stanza_dedupe_v1_done';

/** Read-only consolidation report (for tests / debugging). */
export interface StanzaLibraryConsolidationReport {
  removed: number;
  updated: number;
  takesRemapped: number;
  lastSelectedRemapped: boolean;
}

/**
 * Apply the pure consolidation result to Dexie:
 *   1. Delete dropped rows (by old id).
 *   2. Re-put the surviving winners (with inherited blobs) so the record reflects the union.
 *   3. Re-point any `takes.songId` that referenced a dropped id to the kept id.
 *   4. Re-point `stanzaLastSelectedSongId` if it was about to dangle.
 *
 * All Dexie writes happen inside a single `rw` transaction over `songs` + `takes` so a crash
 * mid-consolidation can't leave the library in a half-merged state.
 */
async function applyConsolidationResult(
  result: StanzaConsolidationResult,
  preExistingRowIds: Set<string>,
): Promise<StanzaLibraryConsolidationReport> {
  const droppedIds = Array.from(result.remappedIds.keys());
  const survivingIds = new Set(result.rows.map((r) => r.id));
  let takesRemapped = 0;
  let lastSelectedRemapped = false;

  await stanzaDb.transaction('rw', stanzaDb.songs, stanzaDb.takes, async () => {
    for (const id of droppedIds) {
      await stanzaDb.songs.delete(id);
    }
    for (const row of result.rows) {
      // Only put rows that already existed (or whose merged content might differ from the
      // original winner). We always put winners that absorbed a loser's local blobs — without
      // this, the inherited audio/thumbnail bytes never reach Dexie.
      if (preExistingRowIds.has(row.id)) {
        await stanzaDb.songs.put(row);
      }
    }
    for (const [oldId, newId] of result.remappedIds) {
      if (!survivingIds.has(newId)) continue;
      const updated = await stanzaDb.takes.where('songId').equals(oldId).modify({ songId: newId });
      takesRemapped += updated;
    }
  });

  const lastSelectedId = readStanzaLastSelectedSongId();
  if (lastSelectedId && result.remappedIds.has(lastSelectedId)) {
    writeStanzaLastSelectedSongId(result.remappedIds.get(lastSelectedId) ?? null);
    lastSelectedRemapped = true;
  }

  return {
    removed: droppedIds.length,
    updated: result.rows.length,
    takesRemapped,
    lastSelectedRemapped,
  };
}

/**
 * Run consolidation against the current Dexie `songs` table. Returns a report describing how
 * much was changed. Safe to call repeatedly: when nothing collapses, the transaction is a
 * no-op.
 */
export async function consolidateStanzaLocalLibrary(): Promise<StanzaLibraryConsolidationReport> {
  const rows = await stanzaDb.songs.toArray();
  const result = consolidateStanzaSongDuplicates(rows);
  if (result.remappedIds.size === 0) {
    return { removed: 0, updated: 0, takesRemapped: 0, lastSelectedRemapped: false };
  }
  return applyConsolidationResult(result, new Set(rows.map((r) => r.id)));
}

/**
 * One-shot startup migration: the very first session this fix ships, the user almost certainly
 * has cross-device duplicates accumulated by the older `addYoutubeSong` flow. We collapse them
 * once, set a `localStorage` flag so we don't re-run pointlessly, and keep going.
 *
 * Re-running on every session would still be safe (consolidation is idempotent), but skipping
 * avoids touching IndexedDB on every cold start when there's nothing to do.
 */
export async function runStanzaLibraryDedupeMigrationOnce(): Promise<
  StanzaLibraryConsolidationReport | null
> {
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage.getItem(ONE_SHOT_FLAG_KEY)) return null;
  } catch {
    // localStorage disabled (private mode); fall through and run once per session.
  }
  const report = await consolidateStanzaLocalLibrary();
  try {
    window.localStorage.setItem(ONE_SHOT_FLAG_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  return report;
}

/**
 * Remap takes for rows already known to be consolidated. Exposed so the Drive sync path can
 * call it after `persistMergedSongs` writes the deduped rows (Drive merges run consolidation
 * inside `mergeDriveRowsIntoLocalLibrary` and surface the resulting `remappedIds` map). Also
 * updates `stanzaLastSelectedSongId` so a session in progress doesn't end up pointing at a
 * dropped row. Returns the number of takes actually updated.
 */
export async function remapStanzaTakesForConsolidation(
  remappedIds: Map<string, string>,
): Promise<number> {
  if (remappedIds.size === 0) return 0;
  let total = 0;
  await stanzaDb.transaction('rw', stanzaDb.takes, async () => {
    for (const [oldId, newId] of remappedIds) {
      total += await stanzaDb.takes.where('songId').equals(oldId).modify({ songId: newId });
    }
  });

  const lastSelected = readStanzaLastSelectedSongId();
  if (lastSelected && remappedIds.has(lastSelected)) {
    writeStanzaLastSelectedSongId(remappedIds.get(lastSelected) ?? null);
  }
  return total;
}
