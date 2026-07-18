import {
  findLatestLabsDriveUndoRingPrePull,
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from '../../shared/drive/labsDriveUndoRingDb';
import type { LyreflyDriveEnvelopeV1 } from './lyreflyDriveEnvelope';
import { parseLyreflyDriveEnvelope, serializeLyreflyDriveEnvelope } from './lyreflyDriveEnvelope';

const LEGACY_KEY = 'labs_lyrefly_drive_undo_snapshots_v1';

export type LyreflyDriveUndoSnapshotTrigger =
  | 'manual-backup'
  | 'pre-pull'
  | 'pre-restore'
  | 'pre-merge'
  | 'history-recovery';

export type LyreflyDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: LyreflyDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

let legacyMigrated = false;

async function ensureMigrated(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  await migrateLegacyLocalStorageUndoRing({ appId: 'lyrefly', legacyStorageKey: LEGACY_KEY });
}

export async function pushLyreflyDriveUndoSnapshot(
  envelope: LyreflyDriveEnvelopeV1,
  trigger: LyreflyDriveUndoSnapshotTrigger,
): Promise<void> {
  await ensureMigrated();
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  await pushLabsDriveUndoRingSnapshot('lyrefly', serializeLyreflyDriveEnvelope(envelope), trigger, label);
}

export async function listLyreflyDriveUndoSnapshots(): Promise<LyreflyDriveUndoSnapshot[]> {
  await ensureMigrated();
  const rows = await listLabsDriveUndoRingSnapshots('lyrefly');
  return rows.map((r) => ({
    createdAt: r.createdAt,
    label: r.label,
    trigger: r.trigger as LyreflyDriveUndoSnapshotTrigger,
    envelopeJson: r.payloadJson,
  }));
}

export function parseLyreflySnapshotEnvelope(snap: LyreflyDriveUndoSnapshot): LyreflyDriveEnvelopeV1 {
  return parseLyreflyDriveEnvelope(snap.envelopeJson);
}

export async function findLatestLyreflyPrePullSnapshot(): Promise<LyreflyDriveUndoSnapshot | null> {
  await ensureMigrated();
  const row = await findLatestLabsDriveUndoRingPrePull('lyrefly');
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    label: row.label,
    trigger: row.trigger as LyreflyDriveUndoSnapshotTrigger,
    envelopeJson: row.payloadJson,
  };
}

export function formatLyreflyDriveUndoSnapshotTrigger(trigger: LyreflyDriveUndoSnapshotTrigger): string {
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
