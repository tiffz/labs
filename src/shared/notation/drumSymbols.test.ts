import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawDrumsSymbolLegendOnCanvas, drawDrumSymbolOnCanvas } from './drumSymbols';

describe('drumSymbols canvas helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('Path2D', class MockPath2D {
      d: string;
      constructor(d: string) {
        this.d = d;
      }
    });
  });

  it('draws legend symbols without throwing', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    expect(ctx).toBeTruthy();
    if (!ctx) return;

    drawDrumSymbolOnCanvas(ctx, 20, 20, 'dum');
    drawDrumsSymbolLegendOnCanvas(ctx, 24, 30);
  });
});
