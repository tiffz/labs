import {
  bleedForBinding,
  DEFAULT_MIXAM_TRIM_PRESET,
  formatPrintDimensions,
  artworkDimensionsWithBleed,
  pixelsAtDpi,
  convertPrintUnits,
  MIXAM_STANDARD_BLEED_IN,
  trimPresetById,
  type BleedConfig,
  type TrimSize,
} from '../../shared/zine/bleedConfig';
import type { ComicProject, LyreflyPrintSpec } from '../types';

export type { LyreflyPrintSpec } from '../types';

export const DEFAULT_LYREFLY_PRINT_SPEC: LyreflyPrintSpec = {
  presetId: DEFAULT_MIXAM_TRIM_PRESET.id,
  trimWidth: DEFAULT_MIXAM_TRIM_PRESET.width,
  trimHeight: DEFAULT_MIXAM_TRIM_PRESET.height,
  unit: 'in',
  dpi: 300,
  binding: 'staple',
  bleedInches: MIXAM_STANDARD_BLEED_IN,
};

export const LYREFLY_DPI_PRESETS = [150, 200, 300, 600] as const;

export const LYREFLY_BLEED_PRESETS = [
  { id: 'none', label: 'None', inches: 0 },
  { id: 'mixam', label: '⅛″', inches: MIXAM_STANDARD_BLEED_IN },
  { id: 'quarter', label: '¼″', inches: 0.25 },
] as const;

export function resolveLyreflyPrintSpec(project: ComicProject): LyreflyPrintSpec {
  if (!project.printSpec) return { ...DEFAULT_LYREFLY_PRINT_SPEC };
  return {
    ...DEFAULT_LYREFLY_PRINT_SPEC,
    ...project.printSpec,
    bleedInches: project.printSpec.bleedInches ?? MIXAM_STANDARD_BLEED_IN,
  };
}

export function trimSizeFromPrintSpec(spec: LyreflyPrintSpec): TrimSize {
  return { width: spec.trimWidth, height: spec.trimHeight, unit: spec.unit };
}

export function bleedInchesForPrintSpec(spec: LyreflyPrintSpec): number {
  return spec.bleedInches ?? MIXAM_STANDARD_BLEED_IN;
}

export function bleedConfigForPrintSpec(spec: LyreflyPrintSpec): BleedConfig {
  const base = bleedForBinding(spec.binding);
  const bleedValue = bleedInchesForPrintSpec(spec);
  return {
    ...base,
    top: bleedValue,
    bottom: bleedValue,
    left: bleedValue,
    right: bleedValue,
    unit: 'in',
  };
}

export function printSpecSummary(spec: LyreflyPrintSpec): {
  presetLabel: string;
  trimLabel: string;
  bleedLabel: string;
  fileLabel: string;
  bleedReadout: string;
  aspectRatio: number;
} {
  const trim = trimSizeFromPrintSpec(spec);
  const bleed = bleedConfigForPrintSpec(spec);
  const artwork = artworkDimensionsWithBleed(trim, bleed);
  const widthPx = pixelsAtDpi(convertPrintUnits(artwork.width, artwork.unit, 'in'), spec.dpi);
  const heightPx = pixelsAtDpi(convertPrintUnits(artwork.height, artwork.unit, 'in'), spec.dpi);
  const bleedInches = bleedInchesForPrintSpec(spec);
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
