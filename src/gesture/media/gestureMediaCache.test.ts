import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  clearGestureMediaCache,
  peekCachedGestureMediaObjectUrl,
  putCachedGestureMediaBlob,
} from './gestureMediaCache';

describe('gestureMediaCache', () => {
  beforeEach(async () => {
    let nextUrl = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:mock-${++nextUrl}`),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
        return 0;
      }),
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: vi.fn() })),
    );
    await gestureDb.delete();
    await gestureDb.open();
    await clearGestureMediaCache();
  });

  afterEach(async () => {
    await clearGestureMediaCache();
    vi.unstubAllGlobals();
  });

  it('stores and retrieves preview blobs from memory after idb put', async () => {
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const url = await putCachedGestureMediaBlob('file-1', 'preview', blob, 320, 'image/jpeg');
    expect(url.startsWith('blob:')).toBe(true);
    expect(peekCachedGestureMediaObjectUrl('file-1', 'preview')).toBe(url);
  });

  it('persists rows in IndexedDB', async () => {
    const blob = new Blob(['session-bytes'], { type: 'image/jpeg' });
    await putCachedGestureMediaBlob('file-2', 'session', blob, 1280, 'image/jpeg');
    const row = await gestureDb.mediaCache.where('[driveFileId+kind]').equals(['file-2', 'session']).first();
    expect(row?.driveFileId).toBe('file-2');
    expect(row?.kind).toBe('session');
    expect(row?.width).toBe(1280);
  });

  it('evicts oldest preview rows beyond the preview limit', async () => {
    for (let i = 0; i < 205; i += 1) {
      const blob = new Blob([`b${i}`], { type: 'image/jpeg' });
      await putCachedGestureMediaBlob(`file-${i}`, 'preview', blob, 320, 'image/jpeg');
    }
    const count = await gestureDb.mediaCache.where('kind').equals('preview').count();
    expect(count).toBeLessThanOrEqual(200);
  });
});
