import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
  warmGesturePreviewUrls,
} from './gesturePreviewImageUrl';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveResolveThumbnailLink: vi.fn(async (token: string, fileId: string) =>
    token ? `https://lh3.googleusercontent.com/${fileId}=s220` : null,
  ),
}));

describe('gesturePreviewImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
