import { afterEach, describe, expect, it, vi } from 'vitest';
import { resizeGesturePreviewBlob } from './gesturePreviewBlobResize';

describe('resizeGesturePreviewBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the original blob when createImageBitmap is unavailable', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const out = await resizeGesturePreviewBlob(blob, 192);
    expect(out).toBe(blob);
  });

  it('downscales wide images to maxWidth', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        return { width: 2000, height: 1000, close };
      }),
    );

    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob | null) => void) => {
      cb(new Blob(['small'], { type: 'image/jpeg' }));
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);

    const blob = new Blob(['big'], { type: 'image/jpeg' });
    const out = await resizeGesturePreviewBlob(blob, 200);
    expect(out.type).toBe('image/jpeg');
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
