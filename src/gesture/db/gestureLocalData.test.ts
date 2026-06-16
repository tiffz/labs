import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gestureDb } from './gestureDb';
import { applyGestureMergedPayload } from './gestureLocalData';

describe('applyGestureMergedPayload', () => {
  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
  });

  afterEach(async () => {
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
    await gestureDb.uploadManifestFiles.clear();
    await gestureDb.uploadStagingBlobs.clear();
    await gestureDb.uploadDirectoryHandles.clear();
  });

  it('preserves local packFiles when merged payload omits the photo index', async () => {
    await gestureDb.packs.put({
      id: 'pack-1',
      driveFolderId: 'folder-1',
      name: 'Cats',
      linkedAt: '2026-01-01T00:00:00.000Z',
      lastIndexedAt: '2026-01-01T00:00:00.000Z',
    });
    await gestureDb.packFiles.put({
      driveFileId: 'photo-1',
      packId: 'pack-1',
      name: 'a.jpg',
      mimeType: 'image/jpeg',
    });

    await applyGestureMergedPayload({
      packs: [
        {
          id: 'pack-1',
          driveFolderId: 'folder-1',
          name: 'Cats',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      packFiles: [],
      drawHistory: [],
    });

    const files = await gestureDb.packFiles.toArray();
    expect(files).toHaveLength(1);
    expect(files[0]?.driveFileId).toBe('photo-1');
  });

  it('drops upload manifest rows for packs removed during merge', async () => {
    await gestureDb.uploadManifestFiles.put({
      id: 'pack-ghost::a.jpg',
      packId: 'pack-ghost',
      relativePath: 'a.jpg',
      name: 'a.jpg',
      size: 100,
      lastModified: 1,
      status: 'pending',
    });

    await applyGestureMergedPayload({
      packs: [],
      packFiles: [],
      drawHistory: [],
    });

    expect(await gestureDb.uploadManifestFiles.count()).toBe(0);
  });
});
