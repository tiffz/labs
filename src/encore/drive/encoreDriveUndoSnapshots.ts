import {
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from '../../shared/drive/labsDriveUndoRingDb';
import { encoreDb } from '../db/encoreDb';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  serializeRepertoireWire,
} from './repertoireWire';

const LEGACY_KEY = 'encore_drive_undo_snapshots_v1';
const MAX = 10;

export type EncoreDriveUndoSnapshotTrigger = 'pre-pull' | 'pre-merge' | 'manual-backup';

export type EncoreDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: EncoreDriveUndoSnapshotTrigger;
  wireJson: string;
};

let legacyMigrated = false;

async function ensureMigrated(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  await migrateLegacyLocalStorageUndoRing({
    appId: 'encore',
    legacyStorageKey: LEGACY_KEY,
    payloadFromLegacy: (row) => (typeof row.wireJson === 'string' ? row.wireJson : null),
  });
}

/**
 * All locally-retained pre-sync snapshots (newest first), used as an additional data-loss recovery
 * source alongside Drive revision history — a snapshot taken before a destructive merge on *this*
 * device can hold content that Drive has since pruned (Drive auto-expires unpinned JSON revisions).
 */
export async function readEncoreDriveUndoSnapshots(): Promise<EncoreDriveUndoSnapshot[]> {
  await ensureMigrated();
  const rows = await listLabsDriveUndoRingSnapshots('encore', MAX);
  return rows.map((r) => ({
    createdAt: r.createdAt,
    label: r.label,
    trigger: r.trigger as EncoreDriveUndoSnapshotTrigger,
    wireJson: r.payloadJson,
  }));
}

export async function snapshotEncoreRepertoireBeforeSync(
  trigger: EncoreDriveUndoSnapshotTrigger,
): Promise<void> {
  try {
    await ensureMigrated();
    const songs = await encoreDb.songs.toArray();
    const performances = await encoreDb.performances.toArray();
    const now = new Date().toISOString();
    const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
    const wire = buildWireFromTables(songs, performances, extras);
    await pushLabsDriveUndoRingSnapshot(
      'encore',
      serializeRepertoireWire(wire),
      trigger,
      new Date(now).toLocaleString(),
      MAX,
    );
  } catch {
    /* quota */
  }
}
