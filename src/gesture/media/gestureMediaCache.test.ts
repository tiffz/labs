import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  clearGestureMediaCache,
  peekCachedGestureMediaObjectUrl,
  putCachedGestureMediaBlob,
} from './gestureMediaCache';

vi.mock('./gesturePreviewBlobResize', () => ({
  resizeGesturePreviewBlob: vi.fn(async (blob: Blob, maxWidth: number) => {
    if (maxWidth >= 320 && blob.size > 10) {
      return new Blob(['small-preview'], { type: 'image/jpeg' });
    }
    return blob;
  }),
}));

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
      vi.fn(async () => ({ width: 64, height: 64, close: vi.fn() })),
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

  it('dedupes concurrent idb hydrates for the same file', async () => {
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await gestureDb.mediaCache.put({
      id: 'preview:file-dup',
      driveFileId: 'file-dup',
      kind: 'preview',
      blob,
      width: 320,
      mimeType: 'image/jpeg',
      fetchedAt: Date.now(),
    });

    const { getCachedGestureMediaObjectUrl } = await import('./gestureMediaCache');
    const [a, b] = await Promise.all([
      getCachedGestureMediaObjectUrl('file-dup', 'preview'),
      getCachedGestureMediaObjectUrl('file-dup', 'preview'),
    ]);
    expect(a).toBe(b);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('evicts oldest preview rows beyond the preview limit', async () => {
    for (let i = 0; i < 205; i += 1) {
      const blob = new Blob([`b${i}`], { type: 'image/jpeg' });
      await putCachedGestureMediaBlob(`file-${i}`, 'preview', blob, 320, 'image/jpeg');
    }
    const count = await gestureDb.mediaCache.where('kind').equals('preview').count();
    expect(count).toBeLessThanOrEqual(200);
  });

  it('downscales preview blobs before idb put', async () => {
    const resize = await import('./gesturePreviewBlobResize');
    const blob = new Blob(['0123456789'], { type: 'image/jpeg' });
    const url = await putCachedGestureMediaBlob('file-wide', 'preview', blob, 320, 'image/jpeg');
    expect(url.startsWith('blob:')).toBe(true);
    expect(resize.resizeGesturePreviewBlob).toHaveBeenCalledWith(blob, 320, 'image/jpeg');
  });

  it('migrates oversized legacy preview blobs on read instead of deleting them', async () => {
    const resize = await import('./gesturePreviewBlobResize');
    const large = new Blob([new Uint8Array(600_000)], { type: 'image/jpeg' });
    await gestureDb.mediaCache.put({
      id: 'preview:file-legacy',
      driveFileId: 'file-legacy',
      kind: 'preview',
      blob: large,
      width: 320,
      mimeType: 'image/jpeg',
      fetchedAt: Date.now(),
    });

    const { getCachedGestureMediaObjectUrl } = await import('./gestureMediaCache');
    const url = await getCachedGestureMediaObjectUrl('file-legacy', 'preview');
    expect(url?.startsWith('blob:')).toBe(true);
    expect(resize.resizeGesturePreviewBlob).toHaveBeenCalled();
  });
});
