import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { composeVerticalScrollBlob } from './verticalScrollExport';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('composeVerticalScrollBlob', () => {
  beforeEach(() => {
    class MockImage {
      width = 40;
      height = 60;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage);

    const ctx = {
      fillStyle: '',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      fillRect() {},
      drawImage() {},
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
      cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stitches segments into a jpeg blob', async () => {
    const blob = await composeVerticalScrollBlob([TINY_PNG, TINY_PNG], { maxWidthPx: 40 });
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects an empty segment list', async () => {
    await expect(composeVerticalScrollBlob([])).rejects.toThrow(/No page images/);
  });
});
