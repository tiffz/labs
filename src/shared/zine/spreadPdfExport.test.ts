import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFacingSpreadPdf } from './spreadPdfExport';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('createFacingSpreadPdf', () => {
  beforeEach(() => {
    class MockImage {
      width = 20;
      height = 30;
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
    // getContext is overloaded; the spy resolves to the WebGPU signature, so cast the 2D mock to that param type.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as GPUCanvasContext);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(TINY_PNG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a digital PDF from facing pages', async () => {
    const blob = await createFacingSpreadPdf(
      [
        {
          id: 's1',
          left: { id: 'l', label: 'Left', imageUrl: TINY_PNG },
          right: { id: 'r', label: 'Right', imageUrl: TINY_PNG },
          isSpread: false,
        },
      ],
      'digital',
    );
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
  });

  it('keeps print pads when one side is blank', async () => {
    const blob = await createFacingSpreadPdf(
      [
        {
          id: 'opening',
          left: { id: 'blank', label: 'Blank', isBlank: true },
          right: { id: 'cover', label: 'Cover', imageUrl: TINY_PNG },
          isSpread: false,
        },
      ],
      'print',
    );
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
  });
});
