import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gestureDb } from '../db/gestureDb';
import { deleteCollectionAndDrivePhotos } from './gestureDeleteCollection';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveTrashFile: vi.fn(),
}));

import { driveListFiles, driveTrashFile } from '../../shared/drive/driveFetch';

describe('deleteCollectionAndDrivePhotos', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
    await gestureDb.uploadManifestFiles.clear();
  });

  it('reports trash progress while removing Drive photos', async () => {
    await gestureDb.packs.add({
      id: 'pack-1',
      name: 'Cats',
      driveFolderId: 'folder-1',
      linkedAt: new Date().toISOString(),
      lastIndexedAt: new Date().toISOString(),
    });

    (driveListFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [
        { id: 'photo-1', name: 'a.jpg', mimeType: 'image/jpeg' },
        { id: 'photo-2', name: 'b.jpg', mimeType: 'image/jpeg' },
      ],
    });
    (driveTrashFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const progress: string[] = [];
    await deleteCollectionAndDrivePhotos('token', 'pack-1', (p) => {
      if (p.phase === 'trashing') progress.push(`${p.done}/${p.total}`);
    });

    expect(progress).toContain('1/2');
    expect(progress).toContain('2/2');
    expect(driveTrashFile).toHaveBeenCalledWith('token', 'photo-1');
    expect(driveTrashFile).toHaveBeenCalledWith('token', 'photo-2');
    expect(driveTrashFile).toHaveBeenCalledWith('token', 'folder-1');
    expect(await gestureDb.packs.get('pack-1')).toBeUndefined();
  });
});
