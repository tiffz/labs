import type { TimeSignature } from './types';

export interface RhythmVariation {
  notation: string;
  note?: string;
  timeSignature?: TimeSignature;
}

export interface LearnMoreLink {
  title: string;
  url: string;
}

export interface RhythmDefinition {
  id: string;
  name: string;
  description: string;
  learnMoreLinks: LearnMoreLink[];
  basePattern: string;
  timeSignature: TimeSignature;
  variations: RhythmVariation[];
  relatedRhythmIds?: string[];
  /**
   * Optional 2/4-style pattern to use when this rhythm is requested in a 4/4 flow.
   * Useful for keeping legacy doubled-groove behavior while using an 8/8 default.
   */
  fourFourMappingPattern?: string;
  /** Optional 12-sixteenth pattern for 6/8 (compound duple). */
  sixEightPattern?: string;
}

export interface RhythmTemplatePreset {
  id: string;
  label: string;
  notation: string;
  timeSignature: TimeSignature;
}

/** Resolved preset variation for a target meter (notation + display label). */
export interface RhythmTemplateVariation {
  notation: string;
  label: string;
}

export const RHYTHM_DATABASE: Record<string, RhythmDefinition> = {
  maqsum: {
    id: 'maqsum',
    name: 'Maqsum',
    description:
      'A very common 4/4 rhythm in Middle Eastern drumming with a versatile groove.',
    learnMoreLinks: [
      { title: 'Wikipedia: Maqsoum', url: 'https://en.wikipedia.org/wiki/Maqsoum' },
    ],
    basePattern: 'D-T-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-T-__D---T-',
    variations: [
      { notation: 'D-T-__T-D---T---' },
      { notation: 'D-T-__T-D-K-T---' },
      { notation: 'D-T-__T-D-K-T-K-' },
      { notation: 'D-T-K-T-D-K-T---' },
      { notation: 'D-T-K-T-D-K-T-K-' },
    ],
    relatedRhythmIds: ['saeidi', 'baladi'],
  },
  saeidi: {
    id: 'saeidi',
    name: 'Saeidi',
    description: 'An energetic 4/4 rhythm with two consecutive dum strokes.',
    learnMoreLinks: [],
    basePattern: 'D-T-__D-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-T-__D-D-T-',
    variations: [
      { notation: 'D-T-__D-D---T---' },
      { notation: 'D-T-__D-D-K-T---' },
      { notation: 'D-T-__D-D-K-T-K-' },
      { notation: 'D-T-K-D-D-K-T---' },
      { notation: 'D-T-K-D-D-K-T-K-' },
    ],
    relatedRhythmIds: ['maqsum', 'baladi'],
  },
  baladi: {
    id: 'baladi',
    name: 'Baladi',
    description: 'A core Egyptian 4/4 rhythm that starts with two dum strokes.',
    learnMoreLinks: [{ title: 'Wikipedia: Baladi', url: 'https://en.wikipedia.org/wiki/Baladi' }],
    basePattern: 'D-D-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-D-__D---T-',
    variations: [
      { notation: 'D-D-__T-D---T---' },
      { notation: 'D-D-__T-D-K-T-K-' },
      { notation: 'D-D-K-T-D-K-T---' },
      { notation: 'D-D-K-T-D-K-T-K-' },
    ],
    relatedRhythmIds: ['maqsum', 'saeidi'],
  },
  ayoub: {
    id: 'ayoub',
    name: 'Ayoub',
    description: 'An energetic 2/4 rhythm often used in faster dance music.',
    learnMoreLinks: [],
    basePattern: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
    sixEightPattern: 'D--K--D-T---',
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'La Bass Fe Eyne variation' },
    ],
    relatedRhythmIds: ['daem'],
  },
  daem: {
    id: 'daem',
    name: 'Da-em',
    description:
      'A lively 2/4 Middle Eastern groove with a ka ornament before the second dum (D-TKD-TK).',
    learnMoreLinks: [],
    basePattern: 'D-TKD-TK',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [{ notation: 'D-TKD-TK' }],
    relatedRhythmIds: ['ayoub'],
  },
  malfuf: {
    id: 'malfuf',
    name: 'Malfuf',
    description: 'An 8/8 rhythm with a strong dum followed by two teks (3+3+2 feel).',
    learnMoreLinks: [],
    basePattern: 'D-----T-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--T--T-',
    sixEightPattern: 'D---T-D---T-',
    variations: [
      { notation: 'D-----T-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-T-K-K-T-K-', note: '8/8 with ka ornaments', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-T---K-T---', note: '8/8 quarter-note anchors', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--T--T-', note: '2/4 variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'D-KT-KT-', note: '2/4 ornamented variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DKKTKKTK', note: '2/4 dense variation', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['kahleegi'],
  },
  kahleegi: {
    id: 'kahleegi',
    name: 'Kahleegi',
    description: 'An 8/8 companion rhythm to Malfuf with a double dum opening (3+3+2 feel).',
    learnMoreLinks: [],
    basePattern: 'D-----D-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--D--T-',
    sixEightPattern: 'D---D-T-----',
    variations: [
      { notation: 'D-----D-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-D-K-K-T-K-', note: '8/8 with ka ornaments', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-D---K-T---', note: '8/8 quarter-note anchors', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--D--T-', note: '2/4 variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DK-D--K-', note: '2/4 ornamented variation', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['malfuf'],
  },
  rockAndRoll: {
    id: 'rockAndRoll',
    name: 'Rock',
    description: 'A basic backbeat groove popular in Western pop and rock.',
    learnMoreLinks: [],
    basePattern: 'D---T---D-D-T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D--T--D-D-T-',
    variations: [
      { notation: 'D---T---D-D-T---' },
      { notation: 'D---T---D---T---', note: 'Simple backbeat' },
      { notation: 'D-K-T-K-D-D-T-K-' },
    ],
  },
  simple: {
    id: 'simple',
    name: 'Simple',
    description: 'Straightforward foundation rhythm family for sketching ideas quickly.',
    learnMoreLinks: [],
    basePattern: 'D---D---D---D---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-----D-----',
    variations: [
      { notation: 'D---D---D---D---' },
      { notation: 'D-------D-------' },
      { notation: 'D-T-D-T-D-T-D-T-' },
      { notation: 'D-D-D-D-D-D-D-D-' },
      { notation: 'T-K-T-K-T-K-T-K-' },
    ],
  },

  // --- 6/8 native rhythms ---

  simple68: {
    id: 'simple68',
    name: 'Simple',
    description: 'Foundational 6/8 patterns for sketching ideas in compound meter.',
    learnMoreLinks: [],
    basePattern: 'D-----D-----',
    timeSignature: { numerator: 6, denominator: 8 },
    variations: [
      { notation: 'D-----D-----' },
      { notation: 'D--D--D--D--' },
      { notation: 'D-D-D-D-D-D-' },
      { notation: 'T-K-T-K-T-K-' },
    ],
  },
};

function shouldDoublePatternForTimeSignature(
  source: TimeSignature,
  target: TimeSignature
): boolean {
  return (
    source.numerator === 2 &&
    source.denominator === 4 &&
    target.numerator === 4 &&
    target.denominator === 4
  );
}

function matchesTimeSignature(first: TimeSignature, second: TimeSignature): boolean {
  return first.numerator === second.numerator && first.denominator === second.denominator;
}

/**
 * Variations for a preset rhythm in the requested meter (e.g. Maqsum ka ornaments in 4/4).
 * Returns an empty array when the preset id is unknown or has no compatible variations.
 */
export function getTemplatePresetVariations(
  presetId: string,
  targetTimeSignature: TimeSignature
): RhythmTemplateVariation[] {
  const rhythm = RHYTHM_DATABASE[presetId];
  if (!rhythm) return [];
  return rhythm.variations
    .map((variation, index) => {
      const sourceSignature = variation.timeSignature ?? rhythm.timeSignature;
      if (
        !matchesTimeSignature(sourceSignature, targetTimeSignature) &&
        !shouldDoublePatternForTimeSignature(sourceSignature, targetTimeSignature)
      ) {
        return null;
      }
      const notation = shouldDoublePatternForTimeSignature(
        sourceSignature,
        targetTimeSignature
      )
        ? `${variation.notation}${variation.notation}`
        : variation.notation;
      return {
        notation,
        label: variation.note?.trim() || `Variation ${index + 1}`,
      };
    })
    .filter((item): item is RhythmTemplateVariation => item !== null);
}

/** Find the preset family that owns this notation (base pattern or any variation). */
export function findRhythmTemplatePresetByNotation(
  notation: string,
  targetTimeSignature: TimeSignature
): RhythmTemplatePreset | undefined {
  const presets = getRhythmTemplatePresets(targetTimeSignature);
  for (const preset of presets) {
    if (preset.notation === notation) return preset;
    if (
      getTemplatePresetVariations(preset.id, targetTimeSignature).some(
        (variation) => variation.notation === notation
      )
    ) {
      return preset;
    }
  }
  return undefined;
}

/** Index of the active variation for a preset notation, or -1 when none match. */
export function getTemplatePresetVariationIndex(
  presetId: string,
  notation: string,
  targetTimeSignature: TimeSignature
): number {
  const variations = getTemplatePresetVariations(presetId, targetTimeSignature);
  if (variations.length === 0) return -1;
  const matchedIndex = variations.findIndex((variation) => variation.notation === notation);
  return matchedIndex >= 0 ? matchedIndex : 0;
}

export function getPresetNotation(
  rhythm: Pick<RhythmDefinition, 'basePattern' | 'timeSignature' | 'fourFourMappingPattern' | 'sixEightPattern'>,
  targetTimeSignature: TimeSignature
): string {
  if (
    targetTimeSignature.numerator === 6 &&
    targetTimeSignature.denominator === 8 &&
    typeof rhythm.sixEightPattern === 'string'
  ) {
    return rhythm.sixEightPattern;
  }
  // Preserve legacy 2/4-to-4/4 preset behavior for select rhythms
  // while allowing richer defaults (e.g., 8/8) elsewhere.
  if (
    targetTimeSignature.numerator === 4 &&
    targetTimeSignature.denominator === 4 &&
    typeof rhythm.fourFourMappingPattern === 'string'
  ) {
    return `${rhythm.fourFourMappingPattern}${rhythm.fourFourMappingPattern}`;
  }
  if (shouldDoublePatternForTimeSignature(rhythm.timeSignature, targetTimeSignature)) {
    return `${rhythm.basePattern}${rhythm.basePattern}`;
  }
  return rhythm.basePattern;
}

function isCompatibleWithTimeSignature(
  rhythm: RhythmDefinition,
  target: TimeSignature
): boolean {
  const native = rhythm.timeSignature;
  if (native.numerator === target.numerator && native.denominator === target.denominator) {
    return true;
  }
  if (shouldDoublePatternForTimeSignature(native, target)) {
    return true;
  }
  if (
    target.numerator === 4 && target.denominator === 4 &&
    typeof rhythm.fourFourMappingPattern === 'string'
  ) {
    return true;
  }
  return false;
}

export function getRhythmTemplatePresets(
  targetTimeSignature: TimeSignature = { numerator: 4, denominator: 4 }
): RhythmTemplatePreset[] {
  return Object.values(RHYTHM_DATABASE)
    .filter((rhythm) => isCompatibleWithTimeSignature(rhythm, targetTimeSignature))
    .map((rhythm) => ({
      id: rhythm.id,
      label: rhythm.name,
      notation: getPresetNotation(rhythm, targetTimeSignature),
      timeSignature: targetTimeSignature,
    }));
}

export type RhythmPresetGroup = {
  id: string;
  label: string;
  presetIds: string[];
};

export type RhythmPresetMeterGroup = {
  id: string;
  meterLabel: string;
  presetIds: string[];
};

export type RhythmPresetFamily = {
  id: string;
  label: string;
  meterGroups: RhythmPresetMeterGroup[];
};

function meterLabel(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

const METER_SORT_ORDER = ['4/4', '2/4', '6/8', '8/8'] as const;

function meterSortKey(label: string): number {
  const index = METER_SORT_ORDER.indexOf(label as (typeof METER_SORT_ORDER)[number]);
  return index >= 0 ? index : METER_SORT_ORDER.length;
}

type FamilySpec = {
  id: string;
  label: string;
  meters: Record<string, string[]>;
};

const PRESET_FAMILIES: FamilySpec[] = [
  {
    id: 'middle-eastern',
    label: 'Middle Eastern',
    meters: {
      '4/4': ['baladi', 'maqsum', 'saeidi'],
      '2/4': ['ayoub', 'daem'],
      '8/8': ['malfuf', 'kahleegi'],
    },
  },
  {
    id: 'common',
    label: 'Common',
    meters: {
      '4/4': ['rockAndRoll', 'simple'],
      '6/8': ['simple68'],
    },
  },
];

/** Type → meter nested families for the load-rhythm picker. */
export function getRhythmPresetFamilies(): RhythmPresetFamily[] {
  const assigned = new Set<string>();
  const families: RhythmPresetFamily[] = [];

  for (const family of PRESET_FAMILIES) {
    const meterGroups: RhythmPresetMeterGroup[] = [];

    for (const meterLabelKey of Object.keys(family.meters).sort(
      (a, b) => meterSortKey(a) - meterSortKey(b),
    )) {
      const presetIds = family.meters[meterLabelKey]!.filter(
        (presetId) => RHYTHM_DATABASE[presetId] && !assigned.has(presetId),
      );
      if (presetIds.length === 0) continue;
      presetIds.forEach((presetId) => assigned.add(presetId));
      meterGroups.push({
        id: `${family.id}-${meterLabelKey.replace('/', '-')}`,
        meterLabel: meterLabelKey,
        presetIds,
      });
    }

    if (meterGroups.length > 0) {
      families.push({ id: family.id, label: family.label, meterGroups });
    }
  }

  const fallbackByMeter = new Map<string, string[]>();
  for (const id of Object.keys(RHYTHM_DATABASE)) {
    if (assigned.has(id)) continue;
    const rhythm = RHYTHM_DATABASE[id]!;
    const label = meterLabel(rhythm.timeSignature);
    const bucket = fallbackByMeter.get(label) ?? [];
    bucket.push(id);
    fallbackByMeter.set(label, bucket);
  }

  if (fallbackByMeter.size > 0) {
    const meterGroups = [...fallbackByMeter.entries()]
      .sort(([a], [b]) => meterSortKey(a) - meterSortKey(b))
      .map(([meterLabelKey, presetIds]) => {
        presetIds.forEach((presetId) => assigned.add(presetId));
        return {
          id: `other-${meterLabelKey.replace('/', '-')}`,
          meterLabel: meterLabelKey,
          presetIds,
        };
      });
    families.push({ id: 'other', label: 'Other', meterGroups });
  }

  return families;
}

/** Flattened groups (legacy); prefer {@link getRhythmPresetFamilies}. */
export function getRhythmPresetGroups(): RhythmPresetGroup[] {
  return getRhythmPresetFamilies().flatMap((family) =>
    family.meterGroups.map((meter) => ({
      id: meter.id,
      label: `${family.label} · ${meter.meterLabel}`,
      presetIds: meter.presetIds,
    })),
  );
}
