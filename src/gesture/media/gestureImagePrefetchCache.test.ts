import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./gestureMediaFetch', () => ({
  fetchAndCacheGestureMediaBlob: vi.fn(),
  peekCachedGestureMediaUrl: vi.fn(),
}));

vi.mock('./gestureDriveImageLoad', () => ({
  probeImageUrlLoads: vi.fn(async () => false),
}));

import { peekCachedGestureMediaUrl } from './gestureMediaFetch';
import {
  clearGestureImagePrefetchCache,
  getCachedGestureImageUrl,
  retainGesturePrefetchKeys,
  resolveGestureSessionImageSrc,
} from './gestureImagePrefetchCache';

describe('gestureImagePrefetchCache', () => {
  beforeEach(() => {
    clearGestureImagePrefetchCache();
    vi.mocked(peekCachedGestureMediaUrl).mockReset();
    vi.stubGlobal('URL', {
      ...URL,
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    clearGestureImagePrefetchCache();
    vi.unstubAllGlobals();
  });

  it('does not revoke media-cache blob URLs when evicting prefetch references', async () => {
    const borrowedBlob = 'blob:gesture-borrowed-test';
    vi.mocked(peekCachedGestureMediaUrl).mockReturnValue(borrowedBlob);

    await resolveGestureSessionImageSrc(null, 'file-a', 'https://example.com/x.jpg', 'a.jpg');
    expect(getCachedGestureImageUrl('file-a')).toBe(borrowedBlob);

    retainGesturePrefetchKeys(['file-b']);

    expect(getCachedGestureImageUrl('file-a')).toBe(borrowedBlob);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(borrowedBlob);
  });

  it('drops stale prefetch rows when media cache no longer holds the blob', async () => {
    const borrowedBlob = 'blob:gesture-borrowed-test';
    vi.mocked(peekCachedGestureMediaUrl).mockReturnValue(borrowedBlob);

    await resolveGestureSessionImageSrc(null, 'file-a', 'https://example.com/x.jpg', 'a.jpg');
    vi.mocked(peekCachedGestureMediaUrl).mockReturnValue(null);

    expect(getCachedGestureImageUrl('file-a')).toBeNull();
  });

  it('probes thumbnail URL before alt=media download', async () => {
    const { fetchAndCacheGestureMediaBlob } = await import('./gestureMediaFetch');
    const { probeImageUrlLoads } = await import('./gestureDriveImageLoad');
    vi.mocked(peekCachedGestureMediaUrl).mockReturnValue(null);
    vi.mocked(probeImageUrlLoads).mockResolvedValue(true);
    vi.mocked(fetchAndCacheGestureMediaBlob).mockResolvedValue('blob:should-not-fetch');

    const url = await resolveGestureSessionImageSrc(
      'token',
      'file-thumb',
      'https://example.com/thumb.jpg',
      'a.jpg',
    );

    expect(url).toBe('https://example.com/thumb.jpg');
    expect(fetchAndCacheGestureMediaBlob).not.toHaveBeenCalled();
  });
});
