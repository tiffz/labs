import { describe, expect, it, vi } from 'vitest';
import { prefetchGestureSessionImages } from './prefetchGestureSessionImages';

vi.mock('./gestureSessionPhotoPipeline', () => ({
  isGestureSessionPhotoDisplayReady: vi.fn(() => false),
  prefetchGestureSessionPhotoUntilReady: vi.fn(async () => undefined),
  prefetchGestureSessionQueuePhoto: vi.fn(async () => undefined),
}));

vi.mock('./gestureImagePrefetchCache', () => ({
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
    const { prefetchGestureSessionPhotoUntilReady } = await import('./gestureSessionPhotoPipeline');
    const result = await prefetchGestureSessionImages(null, queue);
    expect(result).toEqual({ ok: true });
    expect(prefetchGestureSessionPhotoUntilReady).toHaveBeenCalledWith(null, queue[0]);
  });

  it('skips required prefetch when requiredCount is zero', async () => {
    const { prefetchGestureSessionPhotoUntilReady } = await import('./gestureSessionPhotoPipeline');
    vi.mocked(prefetchGestureSessionPhotoUntilReady).mockClear();
    const result = await prefetchGestureSessionImages(null, queue, { requiredCount: 0, aheadCount: 2 });
    expect(result).toEqual({ ok: true });
    expect(prefetchGestureSessionPhotoUntilReady).not.toHaveBeenCalled();
  });
});
