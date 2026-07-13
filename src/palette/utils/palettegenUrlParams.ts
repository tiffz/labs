import type { PalettegenMode } from '../hooks/usePalettegenGallery';

export type PalettegenUrlState = {
  colors: string[];
  mode?: PalettegenMode;
  seed?: string;
};

const HEX_ROW = /^[0-9a-f]{6}(?:,[0-9a-f]{6})*$/i;

export function parsePalettegenUrl(): PalettegenUrlState | null {
  const params = new URLSearchParams(window.location.search);
  const colorsParam = params.get('colors');
  if (!colorsParam || !HEX_ROW.test(colorsParam.replace(/\s/g, ''))) return null;

  const colors = colorsParam
    .split(',')
    .map((hex) => hex.trim().toLowerCase())
    .filter((hex) => /^[0-9a-f]{6}$/.test(hex));

  if (colors.length < 2) return null;

  const modeParam = params.get('mode');
  const mode =
    modeParam === 'image' || modeParam === 'seed' || modeParam === 'random' ? modeParam : undefined;
  const seed = params.get('seed')?.replace(/^#/, '').toLowerCase();

  return {
    colors,
    mode,
    seed: seed && /^[0-9a-f]{6}$/.test(seed) ? `#${seed}` : undefined,
  };
}

export function serializePalettegenUrl(input: {
  colors: string[];
  mode?: PalettegenMode;
  seed?: string;
}): string {
  const url = new URL(window.location.href);
  const hexes = input.colors.map((hex) => hex.replace(/^#/, '').toLowerCase());
  url.searchParams.set('colors', hexes.join(','));

  if (input.mode && input.mode !== 'random') {
    url.searchParams.set('mode', input.mode);
  } else {
    url.searchParams.delete('mode');
  }

  if (input.mode === 'seed' && input.seed) {
    url.searchParams.set('seed', input.seed.replace(/^#/, '').toLowerCase());
  } else {
    url.searchParams.delete('seed');
  }

  return `${url.pathname}${url.search}`;
}
