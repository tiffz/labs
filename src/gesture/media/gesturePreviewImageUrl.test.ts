import { describe, expect, it, vi, beforeEach } from 'vitest';
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
}));

describe('gesturePreviewImageUrl', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mediaFetch = await import('./gestureMediaPolicy');
    vi.mocked(mediaFetch.fetchAndCacheGestureMediaBlob).mockResolvedValue(null);
    vi.mocked(mediaFetch.peekCachedGestureMediaUrl).mockReturnValue(null);
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

  it('serves blob previews from the media cache layer only', async () => {
    const mediaFetch = await import('./gestureMediaPolicy');
    vi.mocked(mediaFetch.fetchAndCacheGestureMediaBlob).mockResolvedValueOnce('blob:cached-preview');
    vi.mocked(mediaFetch.peekCachedGestureMediaUrl).mockReturnValue('blob:cached-preview');

    const url = await resolveGesturePreviewImageUrl('token', 'file-blob');
    expect(url).toBe('blob:cached-preview');
    expect(peekGesturePreviewUrl('file-blob')).toBe('blob:cached-preview');
  });

  it('prefers fast thumbnail links before full-file alt=media cache', async () => {
    const mediaFetch = await import('./gestureMediaPolicy');
    const url = await resolveGesturePreviewImageUrl('token', 'file-fast');
    expect(url).toBe('https://lh3.googleusercontent.com/file-fast=s320');
    expect(mediaFetch.resolveGesturePreviewTierUrl).toHaveBeenCalled();
    expect(mediaFetch.fetchAndCacheGestureMediaBlob).not.toHaveBeenCalled();
  });
});
