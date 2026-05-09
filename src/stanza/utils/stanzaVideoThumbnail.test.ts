import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVideoThumbnailAsJpeg, pickThumbnailSeekSec } from './stanzaVideoThumbnail';

describe('captureVideoThumbnailAsJpeg', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null for non-video blobs', async () => {
    await expect(captureVideoThumbnailAsJpeg(new Blob([], { type: 'audio/mpeg' }))).resolves.toBeNull();
  });

  it('returns null for video MIME when document is missing', async () => {
    vi.stubGlobal('document', undefined);
    await expect(captureVideoThumbnailAsJpeg(new Blob([], { type: 'video/mp4' }))).resolves.toBeNull();
  });
});

describe('pickThumbnailSeekSec', () => {
  it('uses midpoint for normal durations', () => {
    expect(pickThumbnailSeekSec({ duration: 120 } as HTMLVideoElement, 0.5)).toBeCloseTo(60, 5);
    expect(pickThumbnailSeekSec({ duration: 10 } as HTMLVideoElement, 0.5)).toBeCloseTo(5, 5);
  });

  it('respects seek fraction', () => {
    expect(pickThumbnailSeekSec({ duration: 100 } as HTMLVideoElement, 0.25)).toBeCloseTo(25, 5);
  });

  it('falls back when duration is unknown', () => {
    expect(pickThumbnailSeekSec({ duration: NaN } as HTMLVideoElement, 0.5)).toBe(0.05);
    expect(pickThumbnailSeekSec({ duration: 0 } as HTMLVideoElement, 0.5)).toBe(0.05);
  });

  it('handles very short clips without overshooting', () => {
    expect(pickThumbnailSeekSec({ duration: 0.002 } as HTMLVideoElement, 0.5)).toBeCloseTo(0.001, 6);
  });
});
