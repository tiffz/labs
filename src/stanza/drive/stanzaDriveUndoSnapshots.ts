import type { StanzaDriveUndoSnapshotTrigger } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import type { StanzaDriveEnvelopeV1 } from './stanzaDriveEnvelope';
import { parseStanzaDriveEnvelope, serializeStanzaDriveEnvelope } from './stanzaDriveEnvelope';

const LEGACY_KEY = 'labs_stanza_drive_undo_snapshots_v1';
const MAX = 20;

let legacyMigrated = false;

export interface StanzaDriveUndoSnapshot {
  createdAt: number;
  /** ISO label for UI */
  label: string;
  trigger: StanzaDriveUndoSnapshotTrigger;
  envelopeJson: string;
}

interface LegacySnapshot {
  createdAt: number;
  label: string;
  envelopeJson: string;
}

function readLegacyLocalStorage(): LegacySnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as LegacySnapshot[]) : [];
  } catch {
    return [];
  }
}

async function migrateLegacySnapshotsIfNeeded(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  const legacy = readLegacyLocalStorage();
  if (legacy.length === 0) return;
  for (const snap of legacy) {
    await stanzaDb.undoSnapshots.add({
      createdAt: snap.createdAt,
      label: snap.label,
      trigger: 'manual-backup',
      envelopeJson: snap.envelopeJson,
    });
  }
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  await trimSnapshots();
}

async function trimSnapshots(): Promise<void> {
  const rows = await stanzaDb.undoSnapshots.orderBy('createdAt').reverse().toArray();
  if (rows.length <= MAX) return;
  const drop = rows.slice(MAX);
  for (const row of drop) {
    if (row.id != null) await stanzaDb.undoSnapshots.delete(row.id);
  }
}

export async function pushStanzaDriveUndoSnapshot(
  envelope: StanzaDriveEnvelopeV1,
  trigger: StanzaDriveUndoSnapshotTrigger = 'manual-backup',
): Promise<void> {
  await migrateLegacySnapshotsIfNeeded();
  await stanzaDb.undoSnapshots.add({
    createdAt: Date.now(),
    label: new Date().toISOString(),
    trigger,
    envelopeJson: serializeStanzaDriveEnvelope(envelope),
  });
  await trimSnapshots();
}

export async function listStanzaDriveUndoSnapshots(): Promise<StanzaDriveUndoSnapshot[]> {
  await migrateLegacySnapshotsIfNeeded();
  const rows = await stanzaDb.undoSnapshots.orderBy('createdAt').reverse().limit(MAX).toArray();
  return rows.map((row) => ({
    createdAt: row.createdAt,
    label: row.label,
    trigger: row.trigger,
    envelopeJson: row.envelopeJson,
  }));
}

export function parseSnapshotEnvelope(snap: StanzaDriveUndoSnapshot): StanzaDriveEnvelopeV1 {
  return parseStanzaDriveEnvelope(snap.envelopeJson);
}

export function formatStanzaDriveUndoSnapshotTrigger(trigger: StanzaDriveUndoSnapshotTrigger): string {
  switch (trigger) {
    case 'manual-backup':
      return 'Before backup';
    case 'pre-pull':
      return 'Before sync';
    case 'pre-restore':
      return 'Before restore';
    case 'pre-merge':
      return 'Before merge';
    case 'history-recovery':
      return 'Before history recovery';
    default:
      return 'Snapshot';
  }
}

/** Most recent pre-pull snapshot, if any (for "Undo last sync"). */
export async function findLatestPrePullSnapshot(): Promise<StanzaDriveUndoSnapshot | null> {
  const rows = await listStanzaDriveUndoSnapshots();
  return rows.find((r) => r.trigger === 'pre-pull') ?? null;
}
