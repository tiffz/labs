import type { ColorState } from '../color';

export interface PaletteSwatch {
  id: string;
  hex: string;
  label?: string;
  color?: ColorState;
}

export interface ComicPalette {
  id: string;
  name: string;
  swatches: PaletteSwatch[];
  source?: 'manual' | 'coolors' | 'image' | 'import';
  createdAt: string;
}

export function createPaletteFromHexes(
  hexes: string[],
  name = 'Palette',
  source: ComicPalette['source'] = 'manual',
): ComicPalette {
  return {
    id: crypto.randomUUID(),
    name,
    source,
    createdAt: new Date().toISOString(),
    swatches: hexes.map((hex, index) => ({
      id: `swatch-${index}`,
      hex: hex.startsWith('#') ? hex : `#${hex}`,
      label: `Color ${index + 1}`,
    })),
  };
}
