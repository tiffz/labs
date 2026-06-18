import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { zineboxDb } from '../db/zineboxDb';
import { deleteZineboxComic } from './deleteZineboxComic';
import { listZineboxComicTombstones } from './zineboxDriveTombstones';

describe('deleteZineboxComic', () => {
  beforeEach(async () => {
    await zineboxDb.delete();
    await zineboxDb.open();
    window.localStorage.clear();
  });

  it('removes comic rows and records a tombstone', async () => {
    await zineboxDb.comics.put({
      id: 'comic-1',
      title: 'Test',
      source: 'Local',
      fileId: 'comic-1',
      coverThumbnailBase64: 'data:image/png;base64,',
      readStatus: 'unread',
      progressPercentage: 0,
    });

    await deleteZineboxComic('comic-1');

    expect(await zineboxDb.comics.get('comic-1')).toBeUndefined();
    expect(listZineboxComicTombstones().map((t) => t.id)).toContain('comic-1');
  });
});
