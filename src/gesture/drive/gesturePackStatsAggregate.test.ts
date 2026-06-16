import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import { loadGesturePackStatsAggregate } from './gesturePackStatsAggregate';

describe('loadGesturePackStatsAggregate', () => {
  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
  });

  it('aggregates counts, covers, and drawn sets without loading full tables', async () => {
    await gestureDb.packs.add({
      id: 'pack-a',
      driveFolderId: 'folder-a',
      name: 'Album A',
      linkedAt: '2026-01-01T00:00:00.000Z',
      lastIndexedAt: '2026-01-01T00:00:00.000Z',
    });
    await gestureDb.packFiles.bulkPut([
      { driveFileId: 'f1', packId: 'pack-a', name: 'b.jpg', mimeType: 'image/jpeg' },
      { driveFileId: 'f2', packId: 'pack-a', name: 'a.jpg', mimeType: 'image/jpeg' },
      { driveFileId: 'f3', packId: 'pack-b', name: 'solo.jpg', mimeType: 'image/jpeg' },
    ]);
    await gestureDb.drawHistory.put({
      driveFileId: 'f1',
      packId: 'pack-a',
      lastDrawnAt: '2026-01-02T00:00:00.000Z',
    });

    const stats = await loadGesturePackStatsAggregate();

    expect(stats.packFileCount).toBe(3);
    expect(stats.drawHistoryCount).toBe(1);
    expect(stats.counts.get('pack-a')).toBe(2);
    expect(stats.counts.get('pack-b')).toBe(1);
    expect(stats.coverIds.get('pack-a')).toEqual(['f2', 'f1']);
    expect(stats.drawnSets.get('pack-a')?.has('f1')).toBe(true);
  });
});
