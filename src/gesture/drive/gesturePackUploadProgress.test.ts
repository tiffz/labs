import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import { putGesturePackUploadProgress } from './gesturePackUploadProgress';

describe('putGesturePackUploadProgress', () => {
  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
  });

  it('preserves tags and source URL while updating upload counters', async () => {
    await gestureDb.packs.put({
      id: 'pack-a',
      driveFolderId: 'folder-a',
      name: 'Life drawing',
      linkedAt: '2026-01-01T00:00:00.000Z',
      lastIndexedAt: '2026-01-01T00:00:00.000Z',
      uploadStatus: 'uploading',
      expectedFileCount: 100,
      uploadedFileCount: 10,
      tags: ['figure'],
      sourceUrl: 'https://example.com/refs',
    });

    const updated = await putGesturePackUploadProgress('pack-a', {
      uploadedFileCount: 42,
    });

    expect(updated.uploadedFileCount).toBe(42);
    expect(updated.tags).toEqual(['figure']);
    expect(updated.sourceUrl).toBe('https://example.com/refs');

    const row = await gestureDb.packs.get('pack-a');
    expect(row?.tags).toEqual(['figure']);
    expect(row?.sourceUrl).toBe('https://example.com/refs');
  });
});
