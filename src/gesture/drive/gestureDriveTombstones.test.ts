import { afterEach, describe, expect, it } from 'vitest';
import {
  addGestureDriveFileTombstones,
  addGestureDriveFolderTombstone,
  clearAllGestureDriveTombstonesForTesting,
  clearGestureDriveFolderTombstone,
  getTombstonedFileIds,
  getTombstonedFolderIds,
  readGestureDriveTombstones,
  unionGestureDriveTombstones,
} from './gestureDriveTombstones';

afterEach(() => {
  clearAllGestureDriveTombstonesForTesting();
});

describe('gestureDriveTombstones', () => {
  it('round-trips a folder tombstone', () => {
    addGestureDriveFolderTombstone('folder-a', '2026-06-01T00:00:00.000Z');
    expect(getTombstonedFolderIds()).toEqual(new Set(['folder-a']));
  });

  it('unions remote tombstones without losing local-only ones', () => {
    addGestureDriveFolderTombstone('folder-local', '2026-06-01T00:00:00.000Z');
    unionGestureDriveTombstones({
      deletedDriveFolderIds: [{ folderId: 'folder-remote', removedAt: '2026-06-02T00:00:00.000Z' }],
      deletedDriveFileIds: [{ fileId: 'file-remote', removedAt: '2026-06-02T00:00:00.000Z' }],
    });
    expect(getTombstonedFolderIds()).toEqual(new Set(['folder-local', 'folder-remote']));
    expect(getTombstonedFileIds()).toEqual(new Set(['file-remote']));
  });

  it('clears a folder tombstone when the user re-links', () => {
    addGestureDriveFolderTombstone('folder-a');
    clearGestureDriveFolderTombstone('folder-a');
    expect(readGestureDriveTombstones().deletedDriveFolderIds).toEqual([]);
  });

  it('dedupes file tombstones by id keeping newest removedAt', () => {
    addGestureDriveFileTombstones(['file-a'], '2026-06-01T00:00:00.000Z');
    addGestureDriveFileTombstones(['file-a'], '2026-06-03T00:00:00.000Z');
    expect(readGestureDriveTombstones().deletedDriveFileIds).toEqual([
      { fileId: 'file-a', removedAt: '2026-06-03T00:00:00.000Z' },
    ]);
  });
});
