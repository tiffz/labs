import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVexFlowSvgFontStyles,
  fetchVexFlowFontDataUrl,
  injectSvgStyle,
} from './vexFlowFontExport';

describe('vexFlowFontExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and caches Bravura as a data URL', async () => {
    const bytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => bytes.buffer,
      }),
    );

    const first = await fetchVexFlowFontDataUrl('Bravura');
    const second = await fetchVexFlowFontDataUrl('Bravura');

    expect(first).toMatch(/^data:font\/woff2;base64,/);
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('builds @font-face rules for SVG export', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }),
    );

    const css = await buildVexFlowSvgFontStyles(['Bravura']);
    expect(css).toContain("font-family:'Bravura'");
    expect(css).toContain('data:font/woff2;base64,');
  });

  it('injects styles into SVG defs', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    injectSvgStyle(svg, '@font-face{font-family:Bravura;}');

    const style = svg.querySelector('defs style');
    expect(style?.textContent).toContain('Bravura');
  });
});
