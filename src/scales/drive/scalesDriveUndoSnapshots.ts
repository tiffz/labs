import type { ScalesDriveEnvelopeV1 } from './scalesDriveEnvelope';
import { parseScalesDriveEnvelope, serializeScalesDriveEnvelope } from './scalesDriveEnvelope';

const STORAGE_KEY = 'labs_scales_drive_undo_snapshots_v2';
const MAX = 20;

export type ScalesDriveUndoSnapshotTrigger = 'manual-backup' | 'pre-pull' | 'pre-restore' | 'pre-merge';

export type ScalesDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: ScalesDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

type StoredRow = ScalesDriveUndoSnapshot;

function readAll(): StoredRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: StoredRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX)));
}

export function pushScalesDriveUndoSnapshot(
  envelope: ScalesDriveEnvelopeV1,
  trigger: ScalesDriveUndoSnapshotTrigger,
): void {
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  const row: StoredRow = {
    createdAt: Date.now(),
    label,
    trigger,
    envelopeJson: serializeScalesDriveEnvelope(envelope),
  };
  const rows = readAll();
  rows.unshift(row);
  writeAll(rows);
}

export function listScalesDriveUndoSnapshots(): ScalesDriveUndoSnapshot[] {
  return readAll();
}

export function parseScalesSnapshotEnvelope(snap: ScalesDriveUndoSnapshot): ScalesDriveEnvelopeV1 {
  return parseScalesDriveEnvelope(snap.envelopeJson);
}

export function findLatestScalesPrePullSnapshot(): ScalesDriveUndoSnapshot | null {
  return readAll().find((r) => r.trigger === 'pre-pull') ?? null;
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
    default:
      return trigger;
  }
}
