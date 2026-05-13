import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';
import { parseStanzaDriveEnvelope, serializeStanzaDriveEnvelope } from './stanzaDriveEnvelope';

const KEY = 'labs_stanza_drive_undo_snapshots_v1';
const MAX = 5;

export interface StanzaDriveUndoSnapshot {
  createdAt: number;
  /** ISO label for UI */
  label: string;
  envelopeJson: string;
}

function readAll(): StanzaDriveUndoSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as StanzaDriveUndoSnapshot[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: StanzaDriveUndoSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(0, MAX)));
  } catch {
    /* quota / private mode */
  }
}

export function pushStanzaDriveUndoSnapshot(envelope: StanzaDriveEnvelopeV1): void {
  const rows = readAll();
  const snap: StanzaDriveUndoSnapshot = {
    createdAt: Date.now(),
    label: new Date().toISOString(),
    envelopeJson: serializeStanzaDriveEnvelope(envelope),
  };
  writeAll([snap, ...rows]);
}

export function listStanzaDriveUndoSnapshots(): StanzaDriveUndoSnapshot[] {
  return readAll();
}

export function parseSnapshotEnvelope(snap: StanzaDriveUndoSnapshot): StanzaDriveEnvelopeV1 {
  return parseStanzaDriveEnvelope(snap.envelopeJson);
}
