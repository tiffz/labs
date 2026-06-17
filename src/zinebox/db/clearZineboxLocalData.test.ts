import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { clearZineboxLocalData } from './clearZineboxLocalData';
import { zineboxDb } from './zineboxDb';

describe('clearZineboxLocalData', () => {
  beforeEach(async () => {
    await zineboxDb.delete();
    await zineboxDb.open();
  });

  it('clears comics, collections, and comicFiles only', async () => {
    await zineboxDb.comics.put({
      id: 'c1',
      title: 'Test',
      source: 'Local',
      fileId: 'c1',
      coverThumbnailBase64: '',
      readStatus: 'unread',
      progressPercentage: 0,
    });
    await zineboxDb.collections.put({ id: 's1', name: 'Stack', itemIds: ['c1'] });
    await zineboxDb.comicFiles.put({ comicId: 'c1', blob: new Blob(['pdf']) });

    await clearZineboxLocalData();

    expect(await zineboxDb.comics.count()).toBe(0);
    expect(await zineboxDb.collections.count()).toBe(0);
    expect(await zineboxDb.comicFiles.count()).toBe(0);
  });
});
