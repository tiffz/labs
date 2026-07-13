import type { ComicPalette } from './types';

export type MockupTintTarget = 'panelFill' | 'background' | 'bubble' | 'figure' | 'caption';

export interface MockupTintSpec {
  panelIndex: number;
  target: MockupTintTarget;
  swatchIndex: number;
}

export interface MockupPaletteApplyResult {
  panelFills: string[];
  background: string;
  bubble: string;
  figure: string;
  caption: string;
}

const DEFAULT_GRAY = {
  panelFill: '#f5f5f0',
  background: '#ebe8e0',
  bubble: '#ffffff',
  figure: '#333333',
  caption: '#666666',
};

export function applyPaletteToMockup(
  palette: ComicPalette | null,
  panelCount: number,
): MockupPaletteApplyResult {
  if (!palette || palette.swatches.length === 0) {
    return {
      panelFills: Array.from({ length: panelCount }, () => DEFAULT_GRAY.panelFill),
      background: DEFAULT_GRAY.background,
      bubble: DEFAULT_GRAY.bubble,
      figure: DEFAULT_GRAY.figure,
      caption: DEFAULT_GRAY.caption,
    };
  }
  const swatches = palette.swatches;
  const pick = (index: number): string => swatches[index % swatches.length]!.hex;
  return {
    panelFills: Array.from({ length: panelCount }, (_, i) => pick(i)),
    background: pick(0),
    bubble: pick(Math.min(1, swatches.length - 1)),
    figure: pick(Math.min(2, swatches.length - 1)),
    caption: pick(Math.min(3, swatches.length - 1)),
  };
}
