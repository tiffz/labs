/**
 * Palette-driven duotone wash for photo fills (Wikimedia backgrounds), so a real photo reads as
 * part of the same rough color-theory mockup instead of a literal, semantically-recolored photo.
 * Classic two-stop technique: desaturate to luminance, then remap through a dark→light gradient
 * built from the mockup's own ink (dark) and paper/background (light) colors.
 */

interface UnitRgb {
  r: number;
  g: number;
  b: number;
}

function hexToUnitRgb(hex: string): UnitRgb {
  const cleaned = hex.trim().replace(/^#/, '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const value = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(value)) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

export interface DuotoneComponentTables {
  r: string;
  g: string;
  b: string;
}

/** `feComponentTransfer` `tableValues` for an SVG duotone filter mapping dark → light hex. */
export function duotoneComponentTables(darkHex: string, lightHex: string): DuotoneComponentTables {
  const dark = hexToUnitRgb(darkHex);
  const light = hexToUnitRgb(lightHex);
  const table = (from: number, to: number): string => `${from.toFixed(3)} ${to.toFixed(3)}`;
  return {
    r: table(dark.r, light.r),
    g: table(dark.g, light.g),
    b: table(dark.b, light.b),
  };
}

/**
 * Soft photo wash: pull ink toward mid-neutral and light toward near-white so Wikimedia
 * photos stay readable instead of becoming a flat two-tone poster.
 */
export function softPhotoDuotoneTables(inkHex: string, paperHintHex: string): DuotoneComponentTables {
  const ink = hexToUnitRgb(inkHex);
  const paper = hexToUnitRgb(paperHintHex);
  const dark = {
    r: ink.r * 0.42 + 0.22,
    g: ink.g * 0.42 + 0.22,
    b: ink.b * 0.42 + 0.22,
  };
  const light = {
    r: paper.r * 0.28 + 0.72,
    g: paper.g * 0.28 + 0.72,
    b: paper.b * 0.28 + 0.72,
  };
  const table = (from: number, to: number): string =>
    `${Math.min(1, Math.max(0, from)).toFixed(3)} ${Math.min(1, Math.max(0, to)).toFixed(3)}`;
  return {
    r: table(dark.r, light.r),
    g: table(dark.g, light.g),
    b: table(dark.b, light.b),
  };
}

/** Grayscale (luminance) matrix feeding the component-transfer duotone remap. */
export const DUOTONE_GRAYSCALE_MATRIX =
  '0.21 0.72 0.07 0 0  0.21 0.72 0.07 0 0  0.21 0.72 0.07 0 0  0 0 0 1 0';

/**
 * Soft emoji wash: mild desaturate + remap toward palette tint so colorful glyphs
 * still read as board-tinted without becoming flat silhouettes.
 */
export function softEmojiWashTables(tintHex: string): DuotoneComponentTables {
  const tint = hexToUnitRgb(tintHex);
  const dark = {
    r: tint.r * 0.35 + 0.12,
    g: tint.g * 0.35 + 0.12,
    b: tint.b * 0.35 + 0.12,
  };
  const light = {
    r: tint.r * 0.2 + 0.78,
    g: tint.g * 0.2 + 0.78,
    b: tint.b * 0.2 + 0.78,
  };
  const table = (from: number, to: number): string =>
    `${Math.min(1, Math.max(0, from)).toFixed(3)} ${Math.min(1, Math.max(0, to)).toFixed(3)}`;
  return {
    r: table(dark.r, light.r),
    g: table(dark.g, light.g),
    b: table(dark.b, light.b),
  };
}
