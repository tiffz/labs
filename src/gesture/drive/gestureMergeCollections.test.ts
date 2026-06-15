import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gestureDb } from '../db/gestureDb';
import { mergeGestureCollections } from './gestureMergeCollections';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
  driveMoveFile: vi.fn(),
  driveTrashFile: vi.fn(),
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(),
}));

import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveListFiles,
  driveMoveFile,
  driveTrashFile,
} from '../../shared/drive/driveFetch';

describe('mergeGestureCollections', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
    await gestureDb.uploadManifestFiles.clear();
  });

  it('moves source files into a subfolder of the target pack', async () => {
    await gestureDb.packs.bulkAdd([
      {
        id: 'target',
        name: 'Life drawing',
        driveFolderId: 'folder-target',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
      },
      {
        id: 'source',
        name: 'Hands',
        driveFolderId: 'folder-source',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
      },
    ]);
    await gestureDb.packFiles.add({
      driveFileId: 'file-1',
      packId: 'source',
      name: 'a.jpg',
      mimeType: 'image/jpeg',
    });

    (driveListFiles as ReturnType<typeof vi.fn>).mockResolvedValue({ files: [] });
    (driveCreateFolder as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'subfolder-hands' });
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'file-1',
      parents: ['folder-source'],
    });
    (driveMoveFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (driveTrashFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await mergeGestureCollections('token', {
      targetPackId: 'target',
      sourcePackId: 'source',
    });

    expect(result.filesMoved).toBe(1);
    expect(result.subfolderName).toBe('Hands');
    expect(await gestureDb.packs.get('source')).toBeUndefined();
    const moved = await gestureDb.packFiles.get('file-1');
    expect(moved?.packId).toBe('target');
    expect(moved?.name).toBe('Hands/a.jpg');
    expect(driveTrashFile).toHaveBeenCalledWith('token', 'folder-source');
  });
});
