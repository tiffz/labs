import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gestureDb } from '../db/gestureDb';
import {
  canMergeGesturePacks,
  mergeCollectionsIntoNewParent,
  mergedSourceUrlFromPacks,
  mergedSourceUrlsDifferFromPacks,
  mergedTagsFromPacks,
  resumeIncompleteMerge,
  suggestMergedCollectionFolderName,
} from './gestureMergeCollections';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
  driveMoveFile: vi.fn(),
  driveRenameFile: vi.fn(),
  driveTrashFile: vi.fn(),
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(),
}));

vi.mock('./gesturePackIndex', () => ({
  indexGesturePackFromDrive: vi.fn().mockResolvedValue(2),
}));

vi.mock('./gestureDriveLayout', () => ({
  ensureGestureReferencePacksLayout: vi.fn().mockResolvedValue({
    appFolderId: 'app-folder',
    referencePacksFolderId: 'ref-packs',
  }),
  ensureUniquePackFolderName: vi.fn().mockResolvedValue('Merged set'),
}));

import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveMoveFile,
  driveRenameFile,
  driveTrashFile,
} from '../../shared/drive/driveFetch';

describe('gestureMergeCollections', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
    await gestureDb.uploadManifestFiles.clear();
  });

  it('merges metadata from all source packs', () => {
    const packs = [
      {
        id: 'a',
        name: 'A',
        driveFolderId: 'folder-a',
        tags: ['cats'],
        sourceUrl: 'https://example.com/a',
      },
      {
        id: 'b',
        name: 'B',
        driveFolderId: 'folder-b',
        tags: ['environment'],
        sourceUrl: 'https://other.com/b',
      },
    ];
    expect(mergedTagsFromPacks(packs)).toEqual(['cats', 'environment']);
    expect(mergedSourceUrlFromPacks(packs)).toBe('https://example.com/a');
    expect(mergedSourceUrlsDifferFromPacks(packs)).toBe(true);
    expect(
      mergedSourceUrlsDifferFromPacks([
        { ...packs[0], sourceUrl: 'https://gumroad.com/l/abc' },
        { ...packs[1], sourceUrl: 'gumroad.com/l/abc' },
        { ...packs[0], id: 'c', name: 'C', sourceUrl: 'https://gumroad.com/l/abc' },
      ]),
    ).toBe(false);
    expect(suggestMergedCollectionFolderName(packs)).toBe('A + B');
    expect(canMergeGesturePacks(packs)).toBe(true);
  });

  it('moves whole collection folders on Drive instead of each photo', async () => {
    await gestureDb.packs.bulkAdd([
      {
        id: 'target',
        name: 'Life drawing',
        driveFolderId: 'folder-target',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
        tags: ['life'],
      },
      {
        id: 'source',
        name: 'Hands',
        driveFolderId: 'folder-source',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
        sourceUrl: 'https://example.com/hands',
      },
    ]);

    (driveCreateFolder as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'folder-new-parent' });
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockImplementation(
      async (_token: string, id: string) => {
        if (id === 'folder-source') return { id, name: 'Hands', parents: ['ref-packs'] };
        if (id === 'folder-target') return { id, name: 'Life drawing', parents: ['ref-packs'] };
        return { id, parents: ['ref-packs'] };
      },
    );
    (driveMoveFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (driveRenameFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await mergeCollectionsIntoNewParent('token', {
      sourcePackIds: ['target', 'source'],
      parentFolderName: 'Merged set',
      tags: ['custom'],
    });

    expect(result.filesMoved).toBe(2);
    expect(result.folderName).toBe('Merged set');
    expect(result.subfolderNames).toEqual(['Life drawing', 'Hands']);
    expect(await gestureDb.packs.get('source')).toBeUndefined();
    expect(await gestureDb.packs.get('target')).toBeUndefined();

    const newPack = await gestureDb.packs.get(result.newPackId);
    expect(newPack?.driveFolderId).toBe('folder-new-parent');
    expect(newPack?.tags).toEqual(['custom']);
    expect(newPack?.mergeStatus).toBeUndefined();
    expect(driveMoveFile).toHaveBeenCalledWith(
      'token',
      'folder-target',
      'folder-new-parent',
      ['ref-packs'],
    );
    expect(driveMoveFile).toHaveBeenCalledWith(
      'token',
      'folder-source',
      'folder-new-parent',
      ['ref-packs'],
    );
    expect(driveTrashFile).not.toHaveBeenCalled();
  });

  it('resumes an interrupted merge from saved progress', async () => {
    await gestureDb.packs.bulkAdd([
      {
        id: 'parent',
        name: 'Merged set',
        driveFolderId: 'folder-new-parent',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
        mergeStatus: 'incomplete',
        mergeSourcePackIds: ['target', 'source'],
        mergeCompletedSourcePackIds: ['target'],
        mergeSubfolderBySourceId: {
          target: 'Life drawing',
          source: 'Hands',
        },
      },
      {
        id: 'source',
        name: 'Hands',
        driveFolderId: 'folder-source',
        linkedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
      },
    ]);

    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'folder-source',
      name: 'Hands',
      parents: ['ref-packs'],
    });
    (driveMoveFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (driveRenameFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await resumeIncompleteMerge('token', 'parent');

    expect(result.newPackId).toBe('parent');
    expect(await gestureDb.packs.get('source')).toBeUndefined();
    expect(driveMoveFile).toHaveBeenCalledTimes(1);
    expect(driveMoveFile).toHaveBeenCalledWith(
      'token',
      'folder-source',
      'folder-new-parent',
      ['ref-packs'],
    );
  });
});
