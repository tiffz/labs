import type { PalettegenMode } from '../hooks/usePalettegenGallery';

export type PalettegenUrlState = {
  colors: string[];
  mode?: PalettegenMode;
  seed?: string;
};

const HEX_ROW = /^[0-9a-f]{6}(?:,[0-9a-f]{6})*$/i;

/** Modes that can reconstitute a palette from URL params alone (no uploaded files). */
export function isPalettegenShareableMode(mode: PalettegenMode | undefined): mode is 'seed' {
  return mode === 'seed';
}

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
  // Image files are never in the URL — treat legacy `mode=image` as colors-only shares.
  const mode =
    modeParam === 'seed' || modeParam === 'random' ? modeParam : undefined;
  const seed = params.get('seed')?.replace(/^#/, '').toLowerCase();

  return {
    colors,
    mode,
    seed: seed && /^[0-9a-f]{6}$/.test(seed) ? `#${seed}` : undefined,
  };
}

function applyPalettegenSearchParams(
  url: URL,
  input: {
    colors: string[];
    mode?: PalettegenMode;
    seed?: string;
  },
): void {
  const hexes = input.colors.map((hex) => hex.replace(/^#/, '').toLowerCase());
  url.searchParams.set('colors', hexes.join(','));

  // Only seed mode is reconstructible from the URL. Image/random omit `mode`.
  if (isPalettegenShareableMode(input.mode) && input.seed) {
    url.searchParams.set('mode', 'seed');
    url.searchParams.set('seed', input.seed.replace(/^#/, '').toLowerCase());
  } else {
    url.searchParams.delete('mode');
    url.searchParams.delete('seed');
  }
}

/** Relative path+query for live `history.replaceState` sync. */
export function serializePalettegenUrl(input: {
  colors: string[];
  mode?: PalettegenMode;
  seed?: string;
}): string {
  const url = new URL(window.location.href);
  applyPalettegenSearchParams(url, input);
  return `${url.pathname}${url.search}`;
}

/**
 * Absolute, normalized share link: `/palette/?colors=…` (+ seed when applicable).
 * Drops unrelated query params and never embeds `mode=image`.
 */
export function buildPalettegenShareUrl(input: {
  colors: string[];
  mode?: PalettegenMode;
  seed?: string;
}): string {
  const url = new URL('/palette/', window.location.origin);
  applyPalettegenSearchParams(url, input);
  return url.toString();
}
