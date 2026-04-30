import Dexie, { type Table } from 'dexie';
import type { EncorePerformance, EncoreSong } from '../types';

export interface SyncMetaRow {
  id: 'default';
  rootFolderId?: string;
  performancesFolderId?: string;
  sheetMusicFolderId?: string;
  /** Optional folder for uploaded song recordings (MP3, MIDI, etc.). */
  recordingsFolderId?: string;
  repertoireFileId?: string;
  snapshotFileId?: string;
  lastRemoteModified?: string;
  lastRemoteEtag?: string;
  /** Max song/performance `updatedAt` last successfully pushed */
  lastSyncedLocalMaxUpdatedAt?: string;
  lastSuccessfulPullAt?: string;
  lastSuccessfulPushAt?: string;
}

export class EncoreDB extends Dexie {
  songs!: Table<EncoreSong, string>;
  performances!: Table<EncorePerformance, string>;
  syncMeta!: Table<SyncMetaRow, string>;

  constructor() {
    super('encore-repertoire');
    this.version(1).stores({
      songs: 'id, updatedAt, title, artist',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
    });
    this.version(2).stores({
      songs: 'id, updatedAt, title, artist',
      performances: 'id, songId, date, updatedAt, venueTag',
      syncMeta: 'id',
    });
  }
}

export const encoreDb = new EncoreDB();

export async function getSyncMeta(): Promise<SyncMetaRow> {
  const row = await encoreDb.syncMeta.get('default');
  if (row) return row;
  const initial: SyncMetaRow = { id: 'default' };
  await encoreDb.syncMeta.put(initial);
  return initial;
}

export async function patchSyncMeta(patch: Partial<Omit<SyncMetaRow, 'id'>>): Promise<void> {
  const cur = await getSyncMeta();
  await encoreDb.syncMeta.put({ ...cur, ...patch, id: 'default' });
}
