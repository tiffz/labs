import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';
import { parseGestureDriveEnvelope, serializeGestureDriveEnvelope } from './gestureDriveEnvelope';

const STORAGE_KEY = 'labs_gesture_drive_undo_snapshots_v1';
const MAX = 20;

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

function readAll(): GestureDriveUndoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GestureDriveUndoSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: GestureDriveUndoSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX)));
}

export function pushGestureDriveUndoSnapshot(
  envelope: GestureDriveEnvelopeV1,
  trigger: GestureDriveUndoSnapshotTrigger,
): void {
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  const row: GestureDriveUndoSnapshot = {
    createdAt: Date.now(),
    label,
    trigger,
    envelopeJson: serializeGestureDriveEnvelope(envelope),
  };
  const rows = readAll();
  rows.unshift(row);
  writeAll(rows);
}

export function listGestureDriveUndoSnapshots(): GestureDriveUndoSnapshot[] {
  return readAll();
}

export function parseGestureSnapshotEnvelope(snap: GestureDriveUndoSnapshot): GestureDriveEnvelopeV1 {
  return parseGestureDriveEnvelope(snap.envelopeJson);
}

export function findLatestGesturePrePullSnapshot(): GestureDriveUndoSnapshot | null {
  return readAll().find((r) => r.trigger === 'pre-pull') ?? null;
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
