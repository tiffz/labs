/**
 * Shared IndexedDB undo ring for portfolio Drive sync snapshots.
 *
 * Quota: envelopes can exceed localStorage (~5MB). Clear site data still wipes this DB —
 * Drive revision pins + Recover UI remain the recovery path after a full site wipe.
 */
import Dexie, { type Table } from 'dexie';

export type LabsDriveUndoRingAppId =
  | 'scales'
  | 'gesture'
  | 'zinebox'
  | 'lyrefly'
  | 'encore';

export type LabsDriveUndoRingRow = {
  id?: number;
  appId: LabsDriveUndoRingAppId;
  createdAt: number;
  label: string;
  trigger: string;
  /** Serialized envelope (or Encore repertoire wire JSON). */
  payloadJson: string;
};

class LabsDriveUndoRingDatabase extends Dexie {
  snapshots!: Table<LabsDriveUndoRingRow, number>;

  constructor() {
    super('labs-drive-undo-ring');
    this.version(1).stores({
      snapshots: '++id, appId, createdAt, [appId+createdAt], [appId+trigger]',
    });
  }
}

export const labsDriveUndoRingDb = new LabsDriveUndoRingDatabase();

export type LabsDriveUndoRingSnapshot = {
  createdAt: number;
  label: string;
  trigger: string;
  payloadJson: string;
};

const DEFAULT_MAX = 20;

export async function pushLabsDriveUndoRingSnapshot(
  appId: LabsDriveUndoRingAppId,
  payloadJson: string,
  trigger: string,
  label: string,
  max = DEFAULT_MAX,
): Promise<void> {
  await labsDriveUndoRingDb.snapshots.add({
    appId,
    createdAt: Date.now(),
    label,
    trigger,
    payloadJson,
  });
  const rows = await labsDriveUndoRingDb.snapshots.where('appId').equals(appId).toArray();
  const newestFirst = rows.sort((a, b) => b.createdAt - a.createdAt);
  if (newestFirst.length <= max) return;
  for (const drop of newestFirst.slice(max)) {
    if (drop.id != null) await labsDriveUndoRingDb.snapshots.delete(drop.id);
  }
}

export async function listLabsDriveUndoRingSnapshots(
  appId: LabsDriveUndoRingAppId,
  max = DEFAULT_MAX,
): Promise<LabsDriveUndoRingSnapshot[]> {
  const rows = await labsDriveUndoRingDb.snapshots.where('appId').equals(appId).toArray();
  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, max)
    .map((row) => ({
      createdAt: row.createdAt,
      label: row.label,
      trigger: row.trigger,
      payloadJson: row.payloadJson,
    }));
}

export async function findLatestLabsDriveUndoRingPrePull(
  appId: LabsDriveUndoRingAppId,
): Promise<LabsDriveUndoRingSnapshot | null> {
  const rows = await listLabsDriveUndoRingSnapshots(appId);
  return rows.find((r) => r.trigger === 'pre-pull') ?? null;
}

/** One-time migrate from a legacy localStorage JSON array into the shared ring. */
export async function migrateLegacyLocalStorageUndoRing(opts: {
  appId: LabsDriveUndoRingAppId;
  legacyStorageKey: string;
  /** Map a legacy row to payloadJson (default: envelopeJson). */
  payloadFromLegacy?: (row: Record<string, unknown>) => string | null;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(opts.legacyStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.removeItem(opts.legacyStorageKey);
      return;
    }
    const existing = await labsDriveUndoRingDb.snapshots.where('appId').equals(opts.appId).count();
    if (existing === 0) {
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const payloadJson =
          opts.payloadFromLegacy?.(row) ??
          (typeof row.envelopeJson === 'string'
            ? row.envelopeJson
            : typeof row.wireJson === 'string'
              ? row.wireJson
              : null);
        if (!payloadJson) continue;
        await labsDriveUndoRingDb.snapshots.add({
          appId: opts.appId,
          createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
          label: typeof row.label === 'string' ? row.label : new Date().toISOString(),
          trigger: typeof row.trigger === 'string' ? row.trigger : 'manual-backup',
          payloadJson,
        });
      }
    }
    window.localStorage.removeItem(opts.legacyStorageKey);
  } catch {
    /* ignore corrupt legacy */
  }
}
