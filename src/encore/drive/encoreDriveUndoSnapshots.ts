import { encoreDb } from '../db/encoreDb';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  serializeRepertoireWire,
} from './repertoireWire';

const STORAGE_KEY = 'encore_drive_undo_snapshots_v1';
const MAX = 10;

export type EncoreDriveUndoSnapshotTrigger = 'pre-pull' | 'pre-merge' | 'manual-backup';

export type EncoreDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: EncoreDriveUndoSnapshotTrigger;
  wireJson: string;
};

function readAll(): EncoreDriveUndoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EncoreDriveUndoSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function snapshotEncoreRepertoireBeforeSync(
  trigger: EncoreDriveUndoSnapshotTrigger,
): Promise<void> {
  try {
    const songs = await encoreDb.songs.toArray();
    const performances = await encoreDb.performances.toArray();
    const now = new Date().toISOString();
    const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
    const wire = buildWireFromTables(songs, performances, extras);
    const row: EncoreDriveUndoSnapshot = {
      createdAt: Date.now(),
      label: new Date(now).toLocaleString(),
      trigger,
      wireJson: serializeRepertoireWire(wire),
    };
    const rows = [row, ...readAll()].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}
