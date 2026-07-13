// Mixam print bleed + trim utilities (shared by Zine Studio and Lyrefly Draw).
// Canonical reference: https://mixam.com/support/bleed

export type PrintUnit = 'in' | 'cm' | 'mm';

export type MixamBindingType = 'staple' | 'perfect' | 'wire-o' | 'coil' | 'hardcover';

export interface BleedConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: 'in' | 'mm';
  /** Distance from trim line where important content should stay inside. */
  quietArea: number;
  /** Inner binding margin (perfect / wire-o / coil / hardcover). Staple-bound: none. */
  gutter?: number;
}

export interface TrimSize {
  width: number;
  height: number;
  unit: PrintUnit;
}

export interface MixamTrimPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: 'in';
}

/** Mixam standard bleed for interior pages (most items). */
export const MIXAM_STANDARD_BLEED_IN = 0.125;

/** Mixam standard quiet area on outer edges (staple-bound default). */
export const MIXAM_STANDARD_QUIET_IN = 0.25;

export const DEFAULT_BLEED_CONFIG: BleedConfig = {
  top: MIXAM_STANDARD_BLEED_IN,
  bottom: MIXAM_STANDARD_BLEED_IN,
  left: MIXAM_STANDARD_BLEED_IN,
  right: MIXAM_STANDARD_BLEED_IN,
  unit: 'in',
  quietArea: MIXAM_STANDARD_QUIET_IN,
};

/** Mixam industry-standard trim sizes (finished page, without bleed). */
export const MIXAM_TRIM_PRESETS: MixamTrimPreset[] = [
  { id: 'digest', name: 'Digest', width: 5.5, height: 8.5, unit: 'in' },
  { id: 'us-trade', name: 'US Trade', width: 6, height: 9, unit: 'in' },
  { id: 'us-standard', name: 'US Standard', width: 6.69, height: 10.24, unit: 'in' },
  { id: 'letter', name: 'Letter', width: 8.5, height: 11, unit: 'in' },
  { id: 'a6', name: 'A6', width: 4.1, height: 5.8, unit: 'in' },
  { id: 'a5', name: 'A5', width: 5.8, height: 8.3, unit: 'in' },
  { id: 'a4', name: 'A4', width: 8.3, height: 11.7, unit: 'in' },
  { id: 'royal', name: 'Royal', width: 6.14, height: 9.21, unit: 'in' },
  { id: 'executive', name: 'Executive', width: 7, height: 10, unit: 'in' },
  { id: 'square-8', name: '8″ square', width: 8, height: 8, unit: 'in' },
  { id: 'square-7', name: '7″ square', width: 7, height: 7, unit: 'in' },
];

export const DEFAULT_MIXAM_TRIM_PRESET = MIXAM_TRIM_PRESETS[0]!;

/** Gutter (inner binding margin) per Mixam binding table. Staple: N/A. */
export const MIXAM_BINDING_GUTTER_IN: Record<MixamBindingType, number | null> = {
  staple: null,
  perfect: 0.5,
  'wire-o': 0.6,
  coil: 0.6,
  hardcover: 0.5,
};

export const MIXAM_BINDING_LABELS: Record<MixamBindingType, string> = {
  staple: 'Staple (saddle-stitch)',
  perfect: 'Perfect bound',
  'wire-o': 'Wire-O',
  coil: 'Coil / spiral',
  hardcover: 'Hardcover interior',
};

export function bleedForBinding(binding: MixamBindingType): BleedConfig {
  const gutter = MIXAM_BINDING_GUTTER_IN[binding];
  return {
    ...DEFAULT_BLEED_CONFIG,
    gutter: gutter ?? undefined,
  };
}

export function convertPrintUnits(value: number, from: PrintUnit, to: PrintUnit): number {
  if (from === to) return value;
  const toInches = (v: number, unit: PrintUnit): number => {
    if (unit === 'in') return v;
    if (unit === 'cm') return v / 2.54;
    return v / 25.4;
  };
  const fromInches = toInches(value, from);
  if (to === 'in') return fromInches;
  if (to === 'cm') return fromInches * 2.54;
  return fromInches * 25.4;
}

export function bleedValueInTrimUnits(bleed: BleedConfig, trimUnit: PrintUnit): number {
  const bleedUnit: PrintUnit = bleed.unit === 'mm' ? 'mm' : 'in';
  return convertPrintUnits(bleed.top, bleedUnit, trimUnit);
}

export function artworkDimensionsWithBleed(
  trim: TrimSize,
  bleed: BleedConfig,
): { width: number; height: number; unit: PrintUnit } {
  const bleedValue = bleedValueInTrimUnits(bleed, trim.unit);
  return {
    width: trim.width + bleedValue * 2,
    height: trim.height + bleedValue * 2,
    unit: trim.unit,
  };
}

export type BleedOverlayPercents = {
  bleedWidthPercent: number;
  bleedHeightPercent: number;
  quietAreaWidthPercent: number;
  quietAreaHeightPercent: number;
  gutterWidthPercent: number;
};

export type BleedGuidePageSide = 'left' | 'right' | 'single' | 'spread';

export function bleedOverlayPercents(trim: TrimSize, bleed: BleedConfig): BleedOverlayPercents {
  const bleedValue = bleedValueInTrimUnits(bleed, trim.unit);
  let quietValue = bleed.quietArea;
  if (bleed.unit === 'mm' && trim.unit === 'in') {
    quietValue = convertPrintUnits(bleed.quietArea, 'mm', 'in');
  } else if (bleed.unit === 'in' && trim.unit === 'mm') {
    quietValue = convertPrintUnits(bleed.quietArea, 'in', 'mm');
  }

  let gutterValue = bleed.gutter ?? 0;
  if (bleed.gutter) {
    gutterValue =
      bleed.unit === 'mm' && trim.unit === 'in'
        ? convertPrintUnits(bleed.gutter, 'mm', 'in')
        : bleed.unit === 'in' && trim.unit === 'mm'
          ? convertPrintUnits(bleed.gutter, 'in', 'mm')
          : bleed.gutter;
  }

  const fullWidth = trim.width + bleedValue * 2;
  const fullHeight = trim.height + bleedValue * 2;

  const bleedWPercent = fullWidth > 0 ? (bleedValue / fullWidth) * 100 : 0;
  const bleedHPercent = fullHeight > 0 ? (bleedValue / fullHeight) * 100 : 0;
  const quietWPercent = fullWidth > 0 ? ((bleedValue + quietValue) / fullWidth) * 100 : 0;
  const quietHPercent = fullHeight > 0 ? ((bleedValue + quietValue) / fullHeight) * 100 : 0;
  const gutterWPercent = fullWidth > 0 ? ((bleedValue + gutterValue) / fullWidth) * 100 : 0;

  return {
    bleedWidthPercent: Math.min(bleedWPercent, 20),
    bleedHeightPercent: Math.min(bleedHPercent, 20),
    quietAreaWidthPercent: Math.min(quietWPercent, 30),
    quietAreaHeightPercent: Math.min(quietHPercent, 30),
    gutterWidthPercent: Math.min(gutterWPercent, 35),
  };
}

export function formatPrintDimensions(width: number, height: number, unit: PrintUnit): string {
  const roundedW = Math.round(width * 100) / 100;
  const roundedH = Math.round(height * 100) / 100;
  if (unit === 'mm') return `${roundedW} × ${roundedH} mm`;
  if (unit === 'cm') return `${roundedW} × ${roundedH} cm`;
  return `${roundedW}" × ${roundedH}"`;
}

export function pixelsAtDpi(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

export function trimPresetById(id: string | undefined): MixamTrimPreset | undefined {
  if (!id) return undefined;
  return MIXAM_TRIM_PRESETS.find((preset) => preset.id === id);
}
