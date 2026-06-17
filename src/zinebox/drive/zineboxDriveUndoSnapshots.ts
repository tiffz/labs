import type { ZineboxDriveEnvelopeV1 } from './zineboxDriveEnvelope';
import { parseZineboxDriveEnvelope, serializeZineboxDriveEnvelope } from './zineboxDriveEnvelope';

const STORAGE_KEY = 'labs_zinebox_drive_undo_snapshots_v1';
const MAX = 20;

export type ZineboxDriveUndoSnapshotTrigger = 'manual-backup' | 'pre-pull' | 'pre-restore' | 'pre-merge';

export type ZineboxDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: ZineboxDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

function readAll(): ZineboxDriveUndoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ZineboxDriveUndoSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: ZineboxDriveUndoSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX)));
}

export function pushZineboxDriveUndoSnapshot(
  envelope: ZineboxDriveEnvelopeV1,
  trigger: ZineboxDriveUndoSnapshotTrigger,
): void {
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  const row: ZineboxDriveUndoSnapshot = {
    createdAt: Date.now(),
    label,
    trigger,
    envelopeJson: serializeZineboxDriveEnvelope(envelope),
  };
  const rows = readAll();
  rows.unshift(row);
  writeAll(rows);
}

export function listZineboxDriveUndoSnapshots(): ZineboxDriveUndoSnapshot[] {
  return readAll();
}

export function parseZineboxSnapshotEnvelope(snap: ZineboxDriveUndoSnapshot): ZineboxDriveEnvelopeV1 {
  return parseZineboxDriveEnvelope(snap.envelopeJson);
}

export function findLatestZineboxPrePullSnapshot(): ZineboxDriveUndoSnapshot | null {
  return readAll().find((r) => r.trigger === 'pre-pull') ?? null;
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
    default:
      return trigger;
  }
}
