import type { ComicPalette } from './types';

export function exportPaletteAsCssVars(palette: ComicPalette, prefix = '--palette'): string {
  return palette.swatches
    .map((swatch, index) => `  ${prefix}-${index + 1}: ${swatch.hex};`)
    .join('\n');
}

export function exportPaletteAsJson(palette: ComicPalette): string {
  return JSON.stringify(
    {
      name: palette.name,
      colors: palette.swatches.map((s) => s.hex),
    },
    null,
    2,
  );
}

export function exportPaletteAsHexRow(palette: ComicPalette): string {
  return palette.swatches.map((s) => s.hex).join(' ');
}
