import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import { findResumablePackForUploadJob } from './gestureUploadResume';

describe('findResumablePackForUploadJob', () => {
  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
  });

  it('matches incomplete packs by upload source folder name', async () => {
    await gestureDb.packs.put({
      id: 'pack-a',
      driveFolderId: 'folder-a',
      name: 'Life drawing',
      linkedAt: '2026-01-02T00:00:00.000Z',
      lastIndexedAt: '2026-01-02T00:00:00.000Z',
      uploadStatus: 'incomplete',
      uploadSourceFolderName: 'Life drawing',
      expectedFileCount: 100,
      uploadedFileCount: 40,
    });

    const match = await findResumablePackForUploadJob({
      files: [],
      suggestedFolderName: 'Life drawing',
    });
    expect(match?.id).toBe('pack-a');
  });

  it('returns null when no incomplete packs exist', async () => {
    await gestureDb.packs.put({
      id: 'pack-done',
      driveFolderId: 'folder-done',
      name: 'Done',
      linkedAt: '2026-01-02T00:00:00.000Z',
      lastIndexedAt: '2026-01-02T00:00:00.000Z',
    });

    const match = await findResumablePackForUploadJob({
      files: [],
      suggestedFolderName: 'Done',
    });
    expect(match).toBeNull();
  });
});
