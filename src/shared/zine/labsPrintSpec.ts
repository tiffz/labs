import {
  bleedForBinding,
  artworkDimensionsWithBleed,
  convertPrintUnits,
  DEFAULT_MIXAM_TRIM_PRESET,
  formatPrintDimensions,
  MIXAM_STANDARD_BLEED_IN,
  pixelsAtDpi,
  trimPresetById,
  type BleedConfig,
  type MixamBindingType,
  type TrimSize,
} from './bleedConfig';

/** Mixam-oriented trim + export settings (shared by Scrapboard, Lyrefly, Zine Studio). */
export interface LabsPrintSpec {
  presetId: string;
  trimWidth: number;
  trimHeight: number;
  unit: 'in';
  dpi: number;
  binding: MixamBindingType;
  /** Per-side bleed in inches (Mixam default 0.125). */
  bleedInches?: number;
}

export const DEFAULT_LABS_PRINT_SPEC: LabsPrintSpec = {
  presetId: DEFAULT_MIXAM_TRIM_PRESET.id,
  trimWidth: DEFAULT_MIXAM_TRIM_PRESET.width,
  trimHeight: DEFAULT_MIXAM_TRIM_PRESET.height,
  unit: 'in',
  dpi: 300,
  binding: 'staple',
  bleedInches: MIXAM_STANDARD_BLEED_IN,
};

export const LABS_DPI_PRESETS = [150, 200, 300, 600] as const;

export const LABS_BLEED_PRESETS = [
  { id: 'none', label: 'None', inches: 0 },
  { id: 'mixam', label: '⅛″', inches: MIXAM_STANDARD_BLEED_IN },
  { id: 'quarter', label: '¼″', inches: 0.25 },
] as const;

export function trimSizeFromLabsPrintSpec(spec: LabsPrintSpec): TrimSize {
  return { width: spec.trimWidth, height: spec.trimHeight, unit: spec.unit };
}

export function bleedInchesForLabsPrintSpec(spec: LabsPrintSpec): number {
  return spec.bleedInches ?? MIXAM_STANDARD_BLEED_IN;
}

export function bleedConfigForLabsPrintSpec(spec: LabsPrintSpec): BleedConfig {
  const base = bleedForBinding(spec.binding);
  const bleedValue = bleedInchesForLabsPrintSpec(spec);
  return {
    ...base,
    top: bleedValue,
    bottom: bleedValue,
    left: bleedValue,
    right: bleedValue,
    unit: 'in',
  };
}

export function labsPrintSpecSummary(spec: LabsPrintSpec): {
  presetLabel: string;
  trimLabel: string;
  bleedLabel: string;
  fileLabel: string;
  bleedReadout: string;
  aspectRatio: number;
} {
  const trim = trimSizeFromLabsPrintSpec(spec);
  const bleed = bleedConfigForLabsPrintSpec(spec);
  const artwork = artworkDimensionsWithBleed(trim, bleed);
  const widthPx = pixelsAtDpi(convertPrintUnits(artwork.width, artwork.unit, 'in'), spec.dpi);
  const heightPx = pixelsAtDpi(convertPrintUnits(artwork.height, artwork.unit, 'in'), spec.dpi);
  const bleedInches = bleedInchesForLabsPrintSpec(spec);
  const preset = trimPresetById(spec.presetId);
  return {
    presetLabel: preset?.name ?? 'Custom',
    trimLabel: formatPrintDimensions(trim.width, trim.height, trim.unit),
    bleedLabel: formatPrintDimensions(artwork.width, artwork.height, artwork.unit),
    fileLabel: `${widthPx}×${heightPx} px`,
    bleedReadout: bleedInches === 0 ? 'No bleed' : `${bleedInches}″ bleed`,
    aspectRatio: trim.width / trim.height,
  };
}
