import { describe, expect, it, vi } from 'vitest';
import { probeImageUrlLoads } from './gestureDriveImageLoad';

describe('gestureDriveImageLoad', () => {
  it('probeImageUrlLoads resolves true when image loads', async () => {
    const original = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    await expect(probeImageUrlLoads('https://example.com/a.jpg')).resolves.toBe(true);

    vi.stubGlobal('Image', original);
  });

  it('probeImageUrlLoads resolves false when image errors', async () => {
    const original = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    await expect(probeImageUrlLoads('https://example.com/b.jpg')).resolves.toBe(false);

    vi.stubGlobal('Image', original);
  });
});
