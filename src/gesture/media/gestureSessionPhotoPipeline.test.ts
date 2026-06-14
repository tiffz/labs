import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearGestureSessionPhotoDisplayReady,
  isGestureSessionPhotoDisplayReady,
  prefetchGestureSessionPhotoUntilReady,
} from './gestureSessionPhotoPipeline';

vi.mock('./gestureThumbnailLinkCache', () => ({
  resolveGestureReferenceImageUrl: vi.fn(async () => 'https://example.com/thumb.jpg'),
}));

vi.mock('./gestureImagePrefetchCache', () => ({
  getCachedGestureImageUrl: vi.fn(() => null),
  resolveGestureSessionImageSrc: vi.fn(async () => 'https://example.com/display.jpg'),
  preloadGestureImageViaElement: vi.fn(async () => undefined),
}));

describe('gestureSessionPhotoPipeline', () => {
  beforeEach(() => {
    clearGestureSessionPhotoDisplayReady();
    vi.clearAllMocks();
  });

  it('marks a photo display-ready after fetch and decode', async () => {
    const item = { driveFileId: 'a', packId: 'p1', name: 'A' };
    expect(isGestureSessionPhotoDisplayReady('a')).toBe(false);
    await prefetchGestureSessionPhotoUntilReady('token', item);
    expect(isGestureSessionPhotoDisplayReady('a')).toBe(true);
  });

  it('dedupes concurrent prefetch for the same file', async () => {
    const { preloadGestureImageViaElement } = await import('./gestureImagePrefetchCache');
    const item = { driveFileId: 'b', packId: 'p1', name: 'B' };
    await Promise.all([
      prefetchGestureSessionPhotoUntilReady('token', item),
      prefetchGestureSessionPhotoUntilReady('token', item),
    ]);
    expect(preloadGestureImageViaElement).toHaveBeenCalledTimes(1);
  });
});
