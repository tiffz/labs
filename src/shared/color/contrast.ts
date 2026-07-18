import { converter, formatHex, parse } from 'culori';

/**
 * WCAG 2 relative luminance for sRGB hex (0–1).
 * @see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const parsed = parse(hex.trim());
  if (!parsed) return 0;
  const rgb = converter('rgb')(parsed);
  if (!rgb) return 0;
  const channel = (value: number | undefined): number => {
    const c = Math.min(1, Math.max(0, value ?? 0));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two colors (≥1). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Nudge OKLCH lightness of `fg` until contrast vs `bg` meets `minRatio` (default AA body 4.5).
 * Prefers darkening when fg is already darker than bg; otherwise lightens.
 */
export function ensureContrastHex(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const parsed = parse(fg.trim());
  if (!parsed) return fg;
  const oklch = converter('oklch')(parsed);
  if (!oklch) return fg;

  const bgLum = relativeLuminance(bg);
  const fgLum = relativeLuminance(fg);
  const darken = fgLum <= bgLum;
  let best = fg;
  let bestRatio = contrastRatio(fg, bg);

  for (let step = 1; step <= 24; step++) {
    const delta = step * 0.035;
    const next = {
      mode: 'oklch' as const,
      l: Math.min(0.98, Math.max(0.05, (oklch.l ?? 0.5) + (darken ? -delta : delta))),
      c: oklch.c ?? 0,
      h: oklch.h ?? 0,
    };
    const hex = formatHex(next);
    if (!hex) continue;
    const ratio = contrastRatio(hex, bg);
    if (ratio > bestRatio) {
      best = hex;
      bestRatio = ratio;
    }
    if (ratio >= minRatio) return hex;
  }
  return best;
}

const BUBBLE_PAPER = '#ffffff';
const PAGE_PAPER = '#ebe8e0';

/**
 * Polish a comic palette so figure/caption/sfx ink meet AA contrast on bubble + paper.
 * Adjusts luminosity only (hue/chroma preserved as much as culori allows).
 */
export function polishPaletteHexesForComicA11y(hexes: string[]): string[] {
  if (hexes.length === 0) return hexes;
  const ranked = [...hexes].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const darkest = ranked[0]!;
  const mid = ranked[Math.floor(ranked.length / 2)]!;
  const vivid = [...hexes].sort((a, b) => {
    const ca = converter('oklch')(parse(a) ?? { mode: 'rgb', r: 0, g: 0, b: 0 });
    const cb = converter('oklch')(parse(b) ?? { mode: 'rgb', r: 0, g: 0, b: 0 });
    return (cb?.c ?? 0) - (ca?.c ?? 0);
  })[0]!;

  const figure = ensureContrastHex(darkest, BUBBLE_PAPER, 4.5);
  const caption = ensureContrastHex(mid, BUBBLE_PAPER, 4.5);
  const sfx = ensureContrastHex(vivid, PAGE_PAPER, 3); // large/bold SFX — AA large-text floor

  return hexes.map((hex) => {
    if (hex === darkest) return figure;
    if (hex === mid && mid !== darkest) return caption;
    if (hex === vivid && vivid !== darkest && vivid !== mid) return sfx;
    // Soft pastels stay light for sky/ground roles.
    if (relativeLuminance(hex) > 0.72) return hex;
    return ensureContrastHex(hex, BUBBLE_PAPER, 3);
  });
}
