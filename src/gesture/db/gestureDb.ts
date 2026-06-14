import Dexie, { type EntityTable } from 'dexie';

import type {
  GestureDrawRecord,
  GesturePack,
  GesturePackFile,
  GestureUploadManifestFile,
} from '../types';

export type GestureSyncMetaRow = {
  key: 'primary';
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  driveAppFolderId?: string;
};

export class GestureDb extends Dexie {
  packs!: EntityTable<GesturePack, 'id'>;
  packFiles!: EntityTable<GesturePackFile, 'driveFileId'>;
  drawHistory!: EntityTable<GestureDrawRecord, 'driveFileId'>;
  syncMeta!: EntityTable<GestureSyncMetaRow, 'key'>;
  uploadManifestFiles!: EntityTable<GestureUploadManifestFile, 'id'>;

  constructor() {
    super('gesture-practice');
    this.version(1).stores({
      packs: 'id, driveFolderId, linkedAt',
      packFiles: 'driveFileId, packId, name',
      drawHistory: 'driveFileId, packId, lastDrawnAt',
      syncMeta: 'key',
    });
    this.version(2).stores({
      uploadManifestFiles: 'id, packId, status, [packId+status]',
    });
  }
}

export const gestureDb = new GestureDb();
