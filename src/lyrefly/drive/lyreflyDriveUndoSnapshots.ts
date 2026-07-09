import type { LyreflyDriveEnvelopeV1 } from './lyreflyDriveEnvelope';
import { parseLyreflyDriveEnvelope, serializeLyreflyDriveEnvelope } from './lyreflyDriveEnvelope';

const STORAGE_KEY = 'labs_lyrefly_drive_undo_snapshots_v1';
const MAX = 20;

export type LyreflyDriveUndoSnapshotTrigger = 'manual-backup' | 'pre-pull' | 'pre-restore' | 'pre-merge';

export type LyreflyDriveUndoSnapshot = {
  createdAt: number;
  label: string;
  trigger: LyreflyDriveUndoSnapshotTrigger;
  envelopeJson: string;
};

function readAll(): LyreflyDriveUndoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LyreflyDriveUndoSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: LyreflyDriveUndoSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX)));
}

export function pushLyreflyDriveUndoSnapshot(
  envelope: LyreflyDriveEnvelopeV1,
  trigger: LyreflyDriveUndoSnapshotTrigger,
): void {
  const label = new Date(envelope.exportedAt || Date.now()).toLocaleString();
  const row: LyreflyDriveUndoSnapshot = {
    createdAt: Date.now(),
    label,
    trigger,
    envelopeJson: serializeLyreflyDriveEnvelope(envelope),
  };
  const rows = readAll();
  rows.unshift(row);
  writeAll(rows);
}

export function listLyreflyDriveUndoSnapshots(): LyreflyDriveUndoSnapshot[] {
  return readAll();
}

export function parseLyreflySnapshotEnvelope(snap: LyreflyDriveUndoSnapshot): LyreflyDriveEnvelopeV1 {
  return parseLyreflyDriveEnvelope(snap.envelopeJson);
}

export function findLatestLyreflyPrePullSnapshot(): LyreflyDriveUndoSnapshot | null {
  return readAll().find((r) => r.trigger === 'pre-pull') ?? null;
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
    default:
      return trigger;
  }
}
