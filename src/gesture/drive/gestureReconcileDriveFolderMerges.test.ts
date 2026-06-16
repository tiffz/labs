import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gestureDb } from '../db/gestureDb';
import {
  findRegisteredAncestorPackForFolder,
  isDriveFolderDescendantOf,
  reconcileDriveFolderMerges,
} from './gestureReconcileDriveFolderMerges';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
}));

vi.mock('./gesturePackIndex', () => ({
  indexGesturePackFromDrive: vi.fn().mockResolvedValue(3),
}));

import { driveGetFileMetadata } from '../../shared/drive/driveFetch';
import { indexGesturePackFromDrive } from './gesturePackIndex';

describe('gestureReconcileDriveFolderMerges', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
  });

  it('detects folder ancestry on Drive', async () => {
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockImplementation(
      async (_token: string, id: string) => {
        if (id === 'child-folder') return { id, parents: ['parent-folder'] };
        if (id === 'parent-folder') return { id, parents: ['ref-packs'] };
        return { id, parents: [] };
      },
    );

    await expect(
      isDriveFolderDescendantOf('token', 'child-folder', 'parent-folder'),
    ).resolves.toBe(true);
    await expect(
      isDriveFolderDescendantOf('token', 'child-folder', 'ref-packs'),
    ).resolves.toBe(true);
    await expect(
      isDriveFolderDescendantOf('token', 'child-folder', 'child-folder'),
    ).resolves.toBe(false);
  });

  it('finds the nearest registered ancestor pack for a moved folder', async () => {
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockImplementation(
      async (_token: string, id: string) => {
        if (id === 'folder-b') return { id, parents: ['folder-a'] };
        if (id === 'folder-a') return { id, parents: ['ref-packs'] };
        return { id, parents: [] };
      },
    );

    const packByFolderId = new Map([
      [
        'folder-a',
        {
          id: 'pack-a',
          driveFolderId: 'folder-a',
          name: 'Collection A',
          linkedAt: '',
          lastIndexedAt: '',
        },
      ],
    ]);

    const ancestor = await findRegisteredAncestorPackForFolder(
      'token',
      'folder-b',
      packByFolderId,
    );
    expect(ancestor?.id).toBe('pack-a');
  });

  it('reconciles a child collection moved inside a parent on Drive', async () => {
    await gestureDb.packs.bulkAdd([
      {
        id: 'pack-a',
        name: 'Megapack',
        driveFolderId: 'folder-a',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
        tags: ['environment'],
      },
      {
        id: 'pack-b',
        name: 'Hobbiton',
        driveFolderId: 'folder-b',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
        tags: ['travel'],
        sourceUrl: 'https://example.com/source',
      },
    ]);
    await gestureDb.packFiles.bulkAdd([
      {
        driveFileId: 'file-b',
        packId: 'pack-b',
        name: 'a.jpg',
        mimeType: 'image/jpeg',
      },
    ]);

    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockImplementation(
      async (_token: string, id: string) => {
        if (id === 'folder-b') return { id, parents: ['folder-a'] };
        if (id === 'folder-a') return { id, parents: ['ref-packs'] };
        return { id, parents: [] };
      },
    );

    const result = await reconcileDriveFolderMerges('token');

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.parentPackId).toBe('pack-a');
    expect(result.groups[0]?.absorbedNames).toEqual(['Hobbiton']);
    expect(result.messages[0]).toMatch(/Hobbiton/);
    expect(await gestureDb.packs.get('pack-b')).toBeUndefined();
    expect(await gestureDb.packs.get('pack-a')).toMatchObject({
      tags: ['environment', 'travel'],
      sourceUrl: 'https://example.com/source',
    });
    expect(indexGesturePackFromDrive).toHaveBeenCalled();
  });
});
