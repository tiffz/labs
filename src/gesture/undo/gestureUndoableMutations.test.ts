import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveRenameFile: vi.fn().mockResolvedValue(undefined),
}));

import { gestureDb } from '../db/gestureDb';
import {
  clearAllGestureDriveTombstonesForTesting,
  getTombstonedFileIds,
  getTombstonedFolderIds,
} from '../drive/gestureDriveTombstones';
import type { GesturePack } from '../types';
import {
  deleteCollectionFromAppUndoable,
  updatePackMetadataUndoable,
} from './gestureUndoableMutations';

function pack(id: string, overrides: Partial<GesturePack> = {}): GesturePack {
  return {
    id,
    driveFolderId: `folder-${id}`,
    name: `Pack ${id}`,
    linkedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('gestureUndoableMutations', () => {
  beforeEach(async () => {
    clearAllGestureDriveTombstonesForTesting();
    await gestureDb.packs.clear();
    await gestureDb.packFiles.clear();
    await gestureDb.drawHistory.clear();
  });

  it('app-only delete: undo restores rows and clears Drive tombstones', async () => {
    await gestureDb.packs.put(pack('p1'));
    await gestureDb.packFiles.put({
      driveFileId: 'f1',
      packId: 'p1',
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
    });
    await gestureDb.drawHistory.put({
      driveFileId: 'f1',
      packId: 'p1',
      firstDrawnAt: '2026-01-02T00:00:00.000Z',
      lastDrawnAt: '2026-01-02T00:00:00.000Z',
      totalMs: 60_000,
      sessionCount: 1,
    });

    const commit = await deleteCollectionFromAppUndoable('p1');
    expect(commit).not.toBeNull();
    expect(await gestureDb.packs.get('p1')).toBeUndefined();
    expect(getTombstonedFolderIds().has('folder-p1')).toBe(true);
    expect(getTombstonedFileIds().has('f1')).toBe(true);

    await commit!.undo();
    expect((await gestureDb.packs.get('p1'))?.name).toBe('Pack p1');
    expect(await gestureDb.packFiles.where('packId').equals('p1').count()).toBe(1);
    expect(await gestureDb.drawHistory.where('packId').equals('p1').count()).toBe(1);
    expect(getTombstonedFolderIds().has('folder-p1')).toBe(false);
    expect(getTombstonedFileIds().has('f1')).toBe(false);

    await commit!.redo();
    expect(await gestureDb.packs.get('p1')).toBeUndefined();
    expect(getTombstonedFolderIds().has('folder-p1')).toBe(true);
  });

  it('returns null when the pack does not exist', async () => {
    expect(await deleteCollectionFromAppUndoable('missing')).toBeNull();
  });

  it('tags update: undo restores the prior pack row', async () => {
    await gestureDb.packs.put(pack('p1'));

    const { updated, commit } = await updatePackMetadataUndoable(null, 'p1', {
      tags: ['figure', 'ink'],
    });
    expect(updated.tags).toEqual(['figure', 'ink']);
    expect(commit).not.toBeNull();

    await commit!.undo();
    expect((await gestureDb.packs.get('p1'))?.tags).toBeUndefined();

    await commit!.redo();
    expect((await gestureDb.packs.get('p1'))?.tags).toEqual(['figure', 'ink']);
  });

  it('rename returns no commit (Drive folder rename is not undoable)', async () => {
    await gestureDb.packs.put(pack('p1'));
    await expect(
      updatePackMetadataUndoable('token', 'p1', { name: 'Renamed' }),
    ).resolves.toMatchObject({ commit: null });
  });
});
