import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchDriveImageBlob } from './gestureDriveImageLoad';
import {
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
  warmGesturePreviewUrls,
} from './gesturePreviewImageUrl';

vi.mock('./gestureMediaPolicy', () => ({
  fetchAndCacheGestureMediaBlob: vi.fn(async () => null),
  peekCachedGestureMediaUrl: vi.fn(() => null),
  resolveGesturePreviewTierUrl: vi.fn(async (token: string, fileId: string) =>
    token ? `https://lh3.googleusercontent.com/${fileId}=s320` : `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`,
  ),
  GESTURE_PREVIEW_THUMB_WIDTH: 320,
}));

vi.mock('../../shared/drive/driveFetch', () => ({
  driveResolveThumbnailLink: vi.fn(async (token: string, fileId: string) =>
    token ? `https://lh3.googleusercontent.com/${fileId}=s220` : null,
  ),
}));

vi.mock('./gestureDriveImageLoad', () => ({
  probeImageUrlLoads: vi.fn(async () => true),
  fetchDriveImageObjectUrl: vi.fn(),
  fetchDriveImageBlob: vi.fn(async () => ({
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    mimeType: 'image/jpeg',
  })),
}));

vi.mock('./gestureMediaCache', () => ({
  getCachedGestureMediaObjectUrl: vi.fn(async () => null),
  putCachedGestureMediaBlob: vi.fn(async (_id, _kind, blob) => URL.createObjectURL(blob)),
}));

vi.mock('./gesturePreviewBlobResize', () => ({
  resizeGesturePreviewBlob: vi.fn(async (blob: Blob) => blob),
}));

describe('gesturePreviewImageUrl', () => {
  beforeEach(async () => {
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn(() => 'blob:display-pin-test') as typeof URL.createObjectURL;
      URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:display-pin-test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }
    vi.mocked(fetchDriveImageBlob).mockResolvedValue({
      blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
    });
    const mediaFetch = await import('./gestureMediaPolicy');
    vi.mocked(mediaFetch.fetchAndCacheGestureMediaBlob).mockResolvedValue(null);
    vi.mocked(mediaFetch.peekCachedGestureMediaUrl).mockReturnValue(null);
    vi.mocked(mediaFetch.resolveGesturePreviewTierUrl).mockImplementation(
      async (token: string, fileId: string) =>
        token
          ? `https://lh3.googleusercontent.com/${fileId}=s320`
          : `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`,
    );
  });

  it('caches preview-sized urls and serves peeks synchronously', async () => {
    const url = await resolveGesturePreviewImageUrl('token', 'file-a');
    expect(url).toBe('https://lh3.googleusercontent.com/file-a=s320');
    expect(peekGesturePreviewUrl('file-a')).toBe(url);
  });

  it('warms multiple ids with deduped cache writes', async () => {
    await warmGesturePreviewUrls('token', ['file-a', 'file-b', 'file-a']);
    expect(peekGesturePreviewUrl('file-a')).toContain('file-a');
    expect(peekGesturePreviewUrl('file-b')).toContain('file-b');
  });

  it('pins a downscaled display blob when tier resolution only yields alt=media', async () => {
    const mediaFetch = await import('./gestureMediaPolicy');
    const mediaCache = await import('./gestureMediaCache');
    const resize = await import('./gesturePreviewBlobResize');
    vi.mocked(mediaFetch.resolveGesturePreviewTierUrl).mockResolvedValueOnce('blob:cached-preview');

    const url = await resolveGesturePreviewImageUrl('token', 'file-blob');
    expect(url).toBe('blob:display-pin-test');
    expect(resize.resizeGesturePreviewBlob).toHaveBeenCalled();
    expect(mediaCache.putCachedGestureMediaBlob).toHaveBeenCalled();
    expect(peekGesturePreviewUrl('file-blob')).toBe(url);
  });

  it('prefers fast thumbnail links before full-file alt=media cache', async () => {
    const mediaFetch = await import('./gestureMediaPolicy');
    const url = await resolveGesturePreviewImageUrl('token', 'file-fast');
    expect(url).toBe('https://lh3.googleusercontent.com/file-fast=s320');
    expect(mediaFetch.resolveGesturePreviewTierUrl).toHaveBeenCalled();
    expect(mediaFetch.fetchAndCacheGestureMediaBlob).not.toHaveBeenCalled();
  });
});
