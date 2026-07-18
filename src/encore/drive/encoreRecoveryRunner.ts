import { encoreDb, getSyncMeta } from '../db/encoreDb';
import type { EncorePerformance } from '../types';
import {
  driveGetRevisionMedia,
  driveListRevisions,
  type DriveRevisionRow,
} from './driveFetch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import {
  readEncoreDriveUndoSnapshots,
  snapshotEncoreRepertoireBeforeSync,
} from './encoreDriveUndoSnapshots';
import {
  buildDataRecoveryPlan,
  buildSongRestore,
  type RecoveryCategory,
  type RepertoireHistorySnapshot,
  type SongRecoveryEntry,
} from './encoreDataRecovery';
import { parseRepertoireWire } from './repertoireWire';
import { pushRepertoireToDrive } from './repertoireSync';

export type RecoveryScanResult = {
  /** Songs with recoverable lost content (richest/most-recoverable first). */
  entries: SongRecoveryEntry[];
  /** How many Drive revisions were scanned (for "scanned N versions" copy). */
  revisionsScanned: number;
  /** Revisions that failed to parse (corrupt / non-repertoire content) — skipped, not fatal. */
  revisionsSkipped: number;
  /** Local pre-sync undo snapshots also folded into the scan (Drive-pruned content may survive here). */
  localSnapshotsScanned: number;
};

/** Per-song restore selection: which recoverable categories the user ticked for this song. */
export type RecoverySelection = Record<string, RecoveryCategory[]>;

async function resolveRepertoireFileId(accessToken: string): Promise<string> {
  const meta = await getSyncMeta();
  if (meta.repertoireFileId) return meta.repertoireFileId;
  const layout = await ensureEncoreDriveLayout(accessToken);
  return layout.repertoireFileId;
}

/** Parse local undo snapshots into recovery sources. Drive prunes old revisions; these may not be. */
async function readLocalSnapshots(): Promise<RepertoireHistorySnapshot[]> {
  const snapshots: RepertoireHistorySnapshot[] = [];
  for (const snap of await readEncoreDriveUndoSnapshots()) {
    try {
      const wire = parseRepertoireWire(snap.wireJson);
      snapshots.push({
        sourceId: `local:${snap.createdAt}`,
        modifiedTime: new Date(snap.createdAt).toISOString(),
        songs: wire.songs,
        performances: wire.performances,
      });
    } catch {
      /* skip corrupt snapshot */
    }
  }
  return snapshots;
}

/**
 * Scan the revision history of `repertoire_data.json` (plus local pre-sync snapshots) and
 * reconstruct, per song, the richest copy of every entity. Returns only content the current library
 * is missing (deleted songs, lost media/resources/lyrics/journal, deleted performances), so the user
 * is never offered a no-op or a downgrade.
 */
export async function scanRepertoireHistoryForRecovery(
  accessToken: string,
): Promise<RecoveryScanResult> {
  const fileId = await resolveRepertoireFileId(accessToken);
  const revisionRows: DriveRevisionRow[] = await driveListRevisions(accessToken, fileId);

  const snapshots: RepertoireHistorySnapshot[] = [];
  let revisionsSkipped = 0;
  for (const row of revisionRows) {
    if (!row.id) continue;
    try {
      const raw = await driveGetRevisionMedia(accessToken, fileId, row.id);
      const wire = parseRepertoireWire(raw);
      snapshots.push({
        sourceId: `rev:${row.id}`,
        modifiedTime: row.modifiedTime,
        songs: wire.songs,
        performances: wire.performances,
      });
    } catch {
      revisionsSkipped += 1;
    }
  }

  const localSnapshots = await readLocalSnapshots();
  snapshots.push(...localSnapshots);

  const current = {
    songs: await encoreDb.songs.toArray(),
    performances: await encoreDb.performances.toArray(),
  };
  const entries = buildDataRecoveryPlan(current, snapshots);
  return {
    entries,
    revisionsScanned: revisionRows.length,
    revisionsSkipped,
    localSnapshotsScanned: localSnapshots.length,
  };
}

export type RecoveryApplyResult = {
  songsRestored: number;
  performancesRestored: number;
};

/**
 * Apply the selected recovery categories per song: copy only the chosen categories' fields from the
 * recovered superset onto the live row (or recreate a deleted song), recreate any selected deleted
 * performances, bump `updatedAt` so the restored content wins on push, snapshot for undo, and push.
 */
export async function applyDataRecovery(
  accessToken: string,
  entries: SongRecoveryEntry[],
  selection: RecoverySelection,
): Promise<RecoveryApplyResult> {
  const entryById = new Map(entries.map((e) => [e.songId, e] as const));
  const now = new Date().toISOString();
  let songsRestored = 0;
  let performancesRestored = 0;

  const hasWork = Object.values(selection).some((cats) => cats.length > 0);
  if (!hasWork) return { songsRestored: 0, performancesRestored: 0 };

  await snapshotEncoreRepertoireBeforeSync('pre-merge');

  await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
    for (const [songId, categories] of Object.entries(selection)) {
      if (categories.length === 0) continue;
      const entry = entryById.get(songId);
      if (!entry) continue;

      const liveSong = await encoreDb.songs.get(songId);
      const restoredSong = buildSongRestore(entry, liveSong, categories);
      if (restoredSong) {
        await encoreDb.songs.put({ ...restoredSong, updatedAt: now });
        songsRestored += 1;
      }

      if (categories.includes('deletedPerformances')) {
        for (const perf of entry.recoveredPerformances) {
          const next: EncorePerformance = { ...perf, updatedAt: now };
          await encoreDb.performances.put(next);
          performancesRestored += 1;
        }
      }
    }
  });

  // Force-write (no If-Match): the restored data is a non-destructive superset of current + history.
  const fileId = await resolveRepertoireFileId(accessToken);
  await pushRepertoireToDrive(accessToken, fileId, undefined);
  return { songsRestored, performancesRestored };
}
