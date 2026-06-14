import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearGestureSessionPhotoDisplayReady,
  isGestureSessionPhotoDisplayReady,
  markGestureSessionPhotoDisplayReady,
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

  it('re-fetches when display-ready cache URL fails decode', async () => {
    const {
      getCachedGestureImageUrl,
      preloadGestureImageViaElement,
      resolveGestureSessionImageSrc,
    } = await import('./gestureImagePrefetchCache');
    const item = { driveFileId: 'c', packId: 'p1', name: 'C.jpg' };

    vi.mocked(getCachedGestureImageUrl)
      .mockReturnValueOnce('blob:stale')
      .mockReturnValueOnce(null);
    vi.mocked(preloadGestureImageViaElement)
      .mockRejectedValueOnce(new Error('stale blob'))
      .mockResolvedValueOnce(undefined);
    vi.mocked(resolveGestureSessionImageSrc).mockResolvedValue('https://example.com/fresh.jpg');

    markGestureSessionPhotoDisplayReady('c');

    await prefetchGestureSessionPhotoUntilReady('token', item);

    expect(isGestureSessionPhotoDisplayReady('c')).toBe(true);
    expect(resolveGestureSessionImageSrc).toHaveBeenCalled();
    expect(preloadGestureImageViaElement).toHaveBeenCalledTimes(2);
  });

  it('unmarks display-ready when cached URL is missing', async () => {
    const { getCachedGestureImageUrl, resolveGestureSessionImageSrc } = await import(
      './gestureImagePrefetchCache'
    );
    const item = { driveFileId: 'd', packId: 'p1', name: 'D.jpg' };

    markGestureSessionPhotoDisplayReady('d');
    vi.mocked(getCachedGestureImageUrl).mockReturnValue(null);
    vi.mocked(resolveGestureSessionImageSrc).mockResolvedValue('https://example.com/d.jpg');

    await prefetchGestureSessionPhotoUntilReady('token', item);

    expect(isGestureSessionPhotoDisplayReady('d')).toBe(true);
    expect(resolveGestureSessionImageSrc).toHaveBeenCalled();
  });
});
