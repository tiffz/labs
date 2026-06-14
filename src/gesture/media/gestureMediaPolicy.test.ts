import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  GESTURE_MEDIA_TIER,
  GESTURE_PREVIEW_THUMB_WIDTH,
  resolveGesturePreviewTierUrl,
} from './gestureMediaPolicy';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveResolveThumbnailLink: vi.fn(async (token: string, fileId: string) =>
    token ? `https://lh3.googleusercontent.com/${fileId}=s220` : null,
  ),
}));

vi.mock('./gestureMediaCache', () => ({
  getCachedGestureMediaObjectUrl: vi.fn(async () => null),
  peekCachedGestureMediaObjectUrl: vi.fn(() => null),
  putCachedGestureMediaBlob: vi.fn(),
}));

vi.mock('./gestureDriveImageLoad', () => ({
  probeImageUrlLoads: vi.fn(async () => true),
  fetchDriveImageBlob: vi.fn(),
}));

describe('gestureMediaPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('documents preview tier steps with thumbnail before alt=media', () => {
    expect(GESTURE_MEDIA_TIER.preview.steps.at(-1)).toBe('alt-media-blob');
    expect(GESTURE_MEDIA_TIER.preview.steps).toContain('oauth-thumbnail');
    expect(GESTURE_PREVIEW_THUMB_WIDTH).toBe(320);
  });

  it('resolveGesturePreviewTierUrl returns scaled oauth thumbnail without alt=media', async () => {
    const mediaCache = await import('./gestureMediaCache');
    const url = await resolveGesturePreviewTierUrl('token', 'file-fast');
    expect(url).toBe('https://lh3.googleusercontent.com/file-fast=s320');
    expect(mediaCache.getCachedGestureMediaObjectUrl).not.toHaveBeenCalled();
  });
});
