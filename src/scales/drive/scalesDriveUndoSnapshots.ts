import {
  findLatestLabsDriveUndoRingPrePull,
  listLabsDriveUndoRingSnapshots,
  migrateLegacyLocalStorageUndoRing,
  pushLabsDriveUndoRingSnapshot,
} from '../../shared/drive/labsDriveUndoRingDb';
import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';
import { parseScalesDriveEnvelope, serializeScalesDriveEnvelope } from './scalesDriveEnvelope';

const LEGACY_KEY = 'labs_scales_drive_undo_snapshots_v2';

export type ScalesDriveUndoSnapshotTrigger =
  | 'manual-backup'
  | 'pre-pull'
  | 'pre-restore'
  | 'pre-merge'
  | 'history-recovery';

export type ScalesDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: ScalesDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

let legacyMigrated = false;

async function ensureMigrated(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  await migrateLegacyLocalStorageUndoRing({ appId: 'scales', legacyStorageKey: LEGACY_KEY });
}

export async function pushScalesDriveUndoSnapshot(
  envelope: ScalesDriveEnvelopeV1,
  trigger: ScalesDriveUndoSnapshotTrigger,
): Promise<void> {
  await ensureMigrated();
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  await pushLabsDriveUndoRingSnapshot('scales', serializeScalesDriveEnvelope(envelope), trigger, label);
}

export async function listScalesDriveUndoSnapshots(): Promise<ScalesDriveUndoSnapshot[]> {
  await ensureMigrated();
  const rows = await listLabsDriveUndoRingSnapshots('scales');
  return rows.map((r) => ({
    createdAt: r.createdAt,
    label: r.label,
    trigger: r.trigger as ScalesDriveUndoSnapshotTrigger,
    envelopeJson: r.payloadJson,
  }));
}

export function parseScalesSnapshotEnvelope(snap: ScalesDriveUndoSnapshot): ScalesDriveEnvelopeV1 {
  return parseScalesDriveEnvelope(snap.envelopeJson);
}

export async function findLatestScalesPrePullSnapshot(): Promise<ScalesDriveUndoSnapshot | null> {
  await ensureMigrated();
  const row = await findLatestLabsDriveUndoRingPrePull('scales');
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    label: row.label,
    trigger: row.trigger as ScalesDriveUndoSnapshotTrigger,
    envelopeJson: row.payloadJson,
  };
}

export function formatScalesDriveUndoSnapshotTrigger(trigger: ScalesDriveUndoSnapshotTrigger): string {
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
