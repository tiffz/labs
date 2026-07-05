import { beforeEach, describe, expect, it, vi } from 'vitest';
import { svgElementToCanvas } from './svgToCanvas';

describe('svgToCanvas', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-svg');
    global.URL.revokeObjectURL = vi.fn();
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  });

  it('renders a simple SVG to canvas with optional header', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '120');
    svg.setAttribute('height', '40');
    svg.setAttribute('viewBox', '0 0 120 40');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '120');
    rect.setAttribute('height', '40');
    rect.setAttribute('fill', '#000000');
    svg.appendChild(rect);

    const drawHeader = vi.fn();
    const canvas = await svgElementToCanvas(svg, {
      scale: 1,
      headerHeight: 20,
      drawHeader,
    });

    expect(canvas.width).toBe(120);
    expect(canvas.height).toBe(60);
    expect(drawHeader).toHaveBeenCalled();
  });

  it('throws when SVG has no drawable dimensions', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    await expect(svgElementToCanvas(svg)).rejects.toThrow(/no drawable dimensions/i);
  });
});
