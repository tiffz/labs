import type { TimeSignature } from '../rhythm/types';

export const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

export type TimeSignaturePreset = {
  label: string;
  timeSignature: TimeSignature;
};

/** Common meters — mirrors Drums / Count presets; asymmetric entries include default groupings. */
export const COMMON_TIME_SIGNATURE_PRESETS: TimeSignaturePreset[] = [
  { label: '4/4', timeSignature: { numerator: 4, denominator: 4 } },
  { label: '3/4', timeSignature: { numerator: 3, denominator: 4 } },
  { label: '2/4', timeSignature: { numerator: 2, denominator: 4 } },
  { label: '5/4', timeSignature: { numerator: 5, denominator: 4 } },
  { label: '6/8', timeSignature: { numerator: 6, denominator: 8 } },
  { label: '9/8', timeSignature: { numerator: 9, denominator: 8 } },
  { label: '12/8', timeSignature: { numerator: 12, denominator: 8 } },
  { label: '5/8', timeSignature: { numerator: 5, denominator: 8, beatGrouping: [3, 2] } },
  { label: '7/8', timeSignature: { numerator: 7, denominator: 8, beatGrouping: [3, 2, 2] } },
  { label: '8/8', timeSignature: { numerator: 8, denominator: 8, beatGrouping: [3, 3, 2] } },
  { label: '11/8', timeSignature: { numerator: 11, denominator: 8, beatGrouping: [3, 3, 3, 2] } },
];

export const TIME_SIGNATURE_NUMERATOR_MIN = 1;
export const TIME_SIGNATURE_NUMERATOR_MAX = 32;
export const TIME_SIGNATURE_DENOMINATORS = [4, 8] as const;

export function formatTimeSignatureDisplay(timeSignature: TimeSignature): string {
  return `${timeSignature.numerator}/${timeSignature.denominator}`;
}

export function formatTimeSignatureForWordsUrl(timeSignature: TimeSignature): string {
  return formatTimeSignatureDisplay(timeSignature);
}

export function timeSignatureGroupingKey(timeSignature: TimeSignature): string {
  return timeSignature.beatGrouping?.join('+') ?? '';
}

export function timeSignaturesEqual(a: TimeSignature, b: TimeSignature): boolean {
  if (a.numerator !== b.numerator || a.denominator !== b.denominator) return false;
  return timeSignatureGroupingKey(a) === timeSignatureGroupingKey(b);
}

export function isPresetTimeSignature(timeSignature: TimeSignature): boolean {
  return COMMON_TIME_SIGNATURE_PRESETS.some((preset) =>
    timeSignaturesEqual(preset.timeSignature, timeSignature),
  );
}

function clampNumerator(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TIME_SIGNATURE.numerator;
  const rounded = Math.round(value);
  if (rounded < TIME_SIGNATURE_NUMERATOR_MIN || rounded > TIME_SIGNATURE_NUMERATOR_MAX) {
    return DEFAULT_TIME_SIGNATURE.numerator;
  }
  return rounded;
}

function normalizeDenominator(value: unknown): number {
  if (value === 8 || value === 4 || value === 2 || value === 16) return value;
  return DEFAULT_TIME_SIGNATURE.denominator;
}

/** Coerce partial / legacy rows to a valid meter (defaults to 4/4). */
export function normalizeTimeSignature(raw?: Partial<TimeSignature> | null): TimeSignature {
  const numerator = clampNumerator(raw?.numerator ?? DEFAULT_TIME_SIGNATURE.numerator);
  const denominator = normalizeDenominator(raw?.denominator);
  const beatGrouping =
    raw?.beatGrouping?.length && raw.beatGrouping.every((n) => Number.isFinite(n) && n > 0)
      ? raw.beatGrouping.map((n) => Math.round(n))
      : undefined;
  return beatGrouping ? { numerator, denominator, beatGrouping } : { numerator, denominator };
}
