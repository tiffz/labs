import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  deleteStagedUploadBlob,
  hasStagedUploadFiles,
  putStagedUploadBlob,
  readStagedUploadFiles,
} from './gestureUploadStaging';
import { buildUploadManifestId } from './gestureUploadManifest';

describe('gestureUploadStaging', () => {
  const packId = 'pack-staging';

  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
    await gestureDb.uploadManifestFiles.put({
      id: buildUploadManifestId(packId, 'folder/photo.jpg'),
      packId,
      relativePath: 'folder/photo.jpg',
      name: 'photo.jpg',
      size: 4,
      lastModified: 1_700_000_000_000,
      status: 'pending',
    });
  });

  it('stores and reads staged blobs for pending manifest rows', async () => {
    const file = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg', lastModified: 1_700_000_000_000 });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/photo.jpg' });

    await putStagedUploadBlob(packId, file);
    expect(await hasStagedUploadFiles(packId)).toBe(true);

    const files = await readStagedUploadFiles(packId);
    expect(files.length).toBe(1);
    expect(files[0]?.name).toBe('photo.jpg');
  });

  it('deletes staged blob after upload', async () => {
    const file = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg', lastModified: 1_700_000_000_000 });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/photo.jpg' });
    await putStagedUploadBlob(packId, file);
    await deleteStagedUploadBlob(packId, file);
    expect(await hasStagedUploadFiles(packId)).toBe(false);
  });
});
