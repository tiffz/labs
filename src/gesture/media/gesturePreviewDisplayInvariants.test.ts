/**
 * Fast smoke: preview grid display invariants (presubmit).
 * Exhaustive source audit: `gesturePreviewDisplayAudit.test.ts`
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchDriveImageBlob } from './gestureDriveImageLoad';
import { peekGesturePreviewUrl, resolveGesturePreviewImageUrl } from './gesturePreviewImageUrl';

vi.mock('./gestureMediaPolicy', () => ({
  resolveGesturePreviewTierUrl: vi.fn(async (token: string, fileId: string) =>
    token
      ? `https://lh3.googleusercontent.com/${fileId}=s320`
      : `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`,
  ),
  GESTURE_PREVIEW_THUMB_WIDTH: 320,
}));

vi.mock('./gestureMediaCache', () => ({
  getCachedGestureMediaObjectUrl: vi.fn(async () => 'blob:memory-preview'),
  peekCachedGestureMediaObjectUrl: vi.fn(() => 'blob:memory-preview'),
  putCachedGestureMediaBlob: vi.fn(async (_id, _kind, blob) => URL.createObjectURL(blob)),
}));

vi.mock('./gesturePreviewBlobResize', () => ({
  resizeGesturePreviewBlob: vi.fn(async (blob: Blob) => blob),
}));

vi.mock('./gestureDriveImageLoad', () => ({
  fetchDriveImageBlob: vi.fn(async () => ({
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    mimeType: 'image/jpeg',
  })),
}));

function stubUrlObjectUrl(): void {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:display-pin-test') as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:display-pin-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  }
}

describe('gesturePreviewDisplayInvariants (fast smoke)', () => {
  beforeEach(() => {
    stubUrlObjectUrl();
    vi.mocked(fetchDriveImageBlob).mockResolvedValue({
      blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
    });
  });

  it('peek ignores gestureMediaCache LRU blob URLs', () => {
    expect(peekGesturePreviewUrl('any-id')).toBeNull();
  });

  it('resolve pins a display blob when tier only yields alt=media', async () => {
    const mediaFetch = await import('./gestureMediaPolicy');
    vi.mocked(mediaFetch.resolveGesturePreviewTierUrl).mockResolvedValueOnce('blob:tier-blob');

    const url = await resolveGesturePreviewImageUrl('token', 'file-grid');
    expect(fetchDriveImageBlob).toHaveBeenCalled();
    expect(url).toBe('blob:display-pin-test');
    expect(peekGesturePreviewUrl('file-grid')).toBe(url);
  });

  it('hydrateGesturePreviewFromIdb does not surface LRU blobs via peek', async () => {
    const { hydrateGesturePreviewFromIdb } = await import('./gesturePreviewImageUrl');
    const blob = await hydrateGesturePreviewFromIdb('idb-only');
    expect(blob).toBe('blob:memory-preview');
    expect(peekGesturePreviewUrl('idb-only')).toBeNull();
  });
});
