import {
  findLatestLabsDriveUndoRingPrePull,
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from '../../shared/drive/labsDriveUndoRingDb';
import type { ZineboxDriveEnvelopeV1 } from './zineboxDriveEnvelope';
import { parseZineboxDriveEnvelope, serializeZineboxDriveEnvelope } from './zineboxDriveEnvelope';

const LEGACY_KEY = 'labs_zinebox_drive_undo_snapshots_v1';

export type ZineboxDriveUndoSnapshotTrigger =
  | 'manual-backup'
  | 'pre-pull'
  | 'pre-restore'
  | 'pre-merge'
  | 'history-recovery';

export type ZineboxDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: ZineboxDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

let legacyMigrated = false;

async function ensureMigrated(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  await migrateLegacyLocalStorageUndoRing({ appId: 'zinebox', legacyStorageKey: LEGACY_KEY });
}

export async function pushZineboxDriveUndoSnapshot(
  envelope: ZineboxDriveEnvelopeV1,
  trigger: ZineboxDriveUndoSnapshotTrigger,
): Promise<void> {
  await ensureMigrated();
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  await pushLabsDriveUndoRingSnapshot('zinebox', serializeZineboxDriveEnvelope(envelope), trigger, label);
}

export async function listZineboxDriveUndoSnapshots(): Promise<ZineboxDriveUndoSnapshot[]> {
  await ensureMigrated();
  const rows = await listLabsDriveUndoRingSnapshots('zinebox');
  return rows.map((r) => ({
    createdAt: r.createdAt,
    label: r.label,
    trigger: r.trigger as ZineboxDriveUndoSnapshotTrigger,
    envelopeJson: r.payloadJson,
  }));
}

export function parseZineboxSnapshotEnvelope(snap: ZineboxDriveUndoSnapshot): ZineboxDriveEnvelopeV1 {
  return parseZineboxDriveEnvelope(snap.envelopeJson);
}

export async function findLatestZineboxPrePullSnapshot(): Promise<ZineboxDriveUndoSnapshot | null> {
  await ensureMigrated();
  const row = await findLatestLabsDriveUndoRingPrePull('zinebox');
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    label: row.label,
    trigger: row.trigger as ZineboxDriveUndoSnapshotTrigger,
    envelopeJson: row.payloadJson,
  };
}

export function formatZineboxDriveUndoSnapshotTrigger(trigger: ZineboxDriveUndoSnapshotTrigger): string {
  switch (trigger) {
    case 'manual-backup':
      return 'Before manual backup';
    case 'pre-pull':
      return 'Before Drive sync';
    case 'pre-restore':
      return 'Before restore';
    case 'pre-merge':
      return 'Before merge';
    case 'history-recovery':
      return 'Before history recovery';
    default:
      return trigger;
  }
}
