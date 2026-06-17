import Dexie, { type EntityTable } from 'dexie';

import type {
  GestureDrawRecord,
  GestureMediaCacheRow,
  GesturePack,
  GesturePackFile,
  GestureUploadBatchJob,
  GestureUploadBatchSession,
  GestureUploadDirectoryHandleRow,
  GestureUploadManifestFile,
  GestureUploadStagingBlobRow,
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
  mediaCache!: EntityTable<GestureMediaCacheRow, 'id'>;
  uploadStagingBlobs!: EntityTable<GestureUploadStagingBlobRow, 'id'>;
  uploadDirectoryHandles!: EntityTable<GestureUploadDirectoryHandleRow, 'packId'>;
  uploadBatchSessions!: EntityTable<GestureUploadBatchSession, 'id'>;
  uploadBatchJobs!: EntityTable<GestureUploadBatchJob, 'id'>;

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
    this.version(3).stores({
      mediaCache: 'id, driveFileId, kind, fetchedAt, [driveFileId+kind]',
    });
    this.version(4).stores({
      uploadStagingBlobs: 'id, packId, savedAt, [packId+savedAt]',
      uploadDirectoryHandles: 'packId, savedAt',
    });
    this.version(5).stores({
      uploadBatchSessions: 'id, status, createdAt',
      uploadBatchJobs: 'id, sessionId, status, sortIndex, [sessionId+status]',
    });
  }
}

export const gestureDb = new GestureDb();
