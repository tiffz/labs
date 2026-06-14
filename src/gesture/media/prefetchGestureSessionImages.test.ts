import { describe, expect, it, vi } from 'vitest';
import { prefetchGestureSessionImages } from './prefetchGestureSessionImages';

vi.mock('./gestureThumbnailLinkCache', () => ({
  resolveGestureReferenceImageUrl: vi.fn(async () => 'https://example.com/thumb.jpg'),
}));

vi.mock('./gestureImagePrefetchCache', () => ({
  getCachedGestureImageUrl: vi.fn(() => null),
  resolveGestureSessionImageSrc: vi.fn(async () => 'https://example.com/thumb.jpg'),
  retainGesturePrefetchKeys: vi.fn(),
}));

describe('prefetchGestureSessionImages', () => {
  const queue = [
    { driveFileId: 'a', packId: 'p1', name: 'A' },
    { driveFileId: 'b', packId: 'p1', name: 'B' },
  ];

  it('fails when queue is empty', async () => {
    const result = await prefetchGestureSessionImages(null, []);
    expect(result).toEqual({ ok: false, error: 'No photos in this session.' });
  });

  it('prefetches the first photo before starting', async () => {
    const { resolveGestureSessionImageSrc } = await import('./gestureImagePrefetchCache');
    const result = await prefetchGestureSessionImages(null, queue);
    expect(result).toEqual({ ok: true });
    expect(resolveGestureSessionImageSrc).toHaveBeenCalledWith(
      null,
      'a',
      'https://example.com/thumb.jpg',
      'A',
    );
  });
});
