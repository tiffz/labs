import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encoreDriveMediaCacheKey,
  getCachedEncoreDriveMedia,
  putEncoreDriveMediaCache,
  resetEncoreDriveMediaPlaybackCacheForTests,
  shouldRevokeEncoreDriveMediaObjectUrl,
} from './encoreDriveMediaPlaybackCache';

describe('encoreDriveMediaPlaybackCache', () => {
  beforeEach(() => {
    let nextUrl = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:mock-${++nextUrl}`),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    resetEncoreDriveMediaPlaybackCacheForTests();
    vi.unstubAllGlobals();
  });

  it('builds stable cache keys', () => {
    expect(encoreDriveMediaCacheKey({ driveFileId: 'abc' })).toBe('drive:abc');
    expect(encoreDriveMediaCacheKey({ localTakeKey: 'song:take1' })).toBe('local:song:take1');
    expect(encoreDriveMediaCacheKey({})).toBeNull();
  });

  it('reuses object URLs for repeat puts', () => {
    const blob = new Blob(['hello'], { type: 'audio/mpeg' });
    const first = putEncoreDriveMediaCache('drive:1', blob, 'audio/mpeg', 'drive-audio');
    const second = putEncoreDriveMediaCache('drive:1', new Blob(['other']), 'audio/mpeg', 'drive-audio');
    expect(second.objectUrl).toBe(first.objectUrl);
    expect(shouldRevokeEncoreDriveMediaObjectUrl(first.objectUrl)).toBe(false);
  });

  it('returns cached media on get', () => {
    const blob = new Blob(['x'], { type: 'video/mp4' });
    putEncoreDriveMediaCache('drive:v1', blob, 'video/mp4', 'drive-video');
    expect(getCachedEncoreDriveMedia('drive:v1')).toEqual({
      objectUrl: expect.any(String),
      mimeType: 'video/mp4',
      kind: 'drive-video',
    });
  });
});
