import {
  findLatestLabsDriveUndoRingPrePull,
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from '../../shared/drive/labsDriveUndoRingDb';
import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import { parseGestureDriveEnvelope, serializeGestureDriveEnvelope } from './gestureDriveEnvelope';

const LEGACY_KEY = 'labs_gesture_drive_undo_snapshots_v1';

export type GestureDriveUndoSnapshotTrigger =
  | 'manual-backup'
  | 'pre-pull'
  | 'pre-restore'
  | 'pre-merge'
  | 'history-recovery';

export type GestureDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: GestureDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

let legacyMigrated = false;

async function ensureMigrated(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  await migrateLegacyLocalStorageUndoRing({ appId: 'gesture', legacyStorageKey: LEGACY_KEY });
}

export async function pushGestureDriveUndoSnapshot(
  envelope: GestureDriveEnvelopeV1,
  trigger: GestureDriveUndoSnapshotTrigger,
): Promise<void> {
  await ensureMigrated();
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  await pushLabsDriveUndoRingSnapshot('gesture', serializeGestureDriveEnvelope(envelope), trigger, label);
}

export async function listGestureDriveUndoSnapshots(): Promise<GestureDriveUndoSnapshot[]> {
  await ensureMigrated();
  const rows = await listLabsDriveUndoRingSnapshots('gesture');
  return rows.map((r) => ({
    createdAt: r.createdAt,
    label: r.label,
    trigger: r.trigger as GestureDriveUndoSnapshotTrigger,
    envelopeJson: r.payloadJson,
  }));
}

export function parseGestureSnapshotEnvelope(snap: GestureDriveUndoSnapshot): GestureDriveEnvelopeV1 {
  return parseGestureDriveEnvelope(snap.envelopeJson);
}

export async function findLatestGesturePrePullSnapshot(): Promise<GestureDriveUndoSnapshot | null> {
  await ensureMigrated();
  const row = await findLatestLabsDriveUndoRingPrePull('gesture');
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    label: row.label,
    trigger: row.trigger as GestureDriveUndoSnapshotTrigger,
    envelopeJson: row.payloadJson,
  };
}

export function formatGestureDriveUndoSnapshotTrigger(
  trigger: GestureDriveUndoSnapshotTrigger,
): string {
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
