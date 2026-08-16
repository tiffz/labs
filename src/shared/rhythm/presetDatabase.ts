import { MIDDLE_EASTERN_RHYTHMS } from './middleEasternRhythms';
import type { TimeSignature } from './types';

export interface RhythmVariation {
  notation: string;
  note?: string;
  timeSignature?: TimeSignature;
  /**
   * This line is the base rhythm with extra decoration, so it must hit every attack the base
   * pattern hits, with the same stroke. `presetIntegrity` enforces it.
   *
   * Set it on ornament and anchor lines. Do NOT set it on variations that deliberately change a
   * stroke (Ayoub's "La Bass Fe Eyne" swaps a dum for a tek). Structural, not descriptive: the
   * check used to be triggered by matching words in `note`, which meant rewording the copy turned
   * the guardrail off silently.
   */
  preservesReferenceBackbone?: boolean;
}

export interface LearnMoreLink {
  title: string;
  url: string;
}

/**
 * A name this rhythm also goes by.
 *
 * These traditions cross borders and scripts, so one pattern often carries several names — Baladi
 * is Masmudi Saghir, Ayoub is Zar in Egypt. A learner who knows a rhythm by one name should be
 * able to find it under the one this app uses.
 *
 * `name` is the alternate; the app's own `name` stays canonical and is what every description
 * refers to, so the copy never drifts between synonyms.
 */
export interface AlternateRhythmName {
  /**
   * The alternate name, in the Latin alphabet.
   *
   * ENGLISH ONLY, here and in `context`. Arabic, Persian and Kurdish script used to render
   * alongside these names and was removed: the owner does not read those scripts, so she could not
   * check what the app was publishing under her name. Script belongs in source comments, where it
   * is provenance for the next editor rather than a claim made to a reader.
   */
  name: string;
  /** Plain-English note on where the name comes from: "Kurdish spelling", "common spelling". */
  context?: string;
}

export interface RhythmDefinition {
  id: string;
  name: string;
  description: string;
  /** Other names for the same rhythm. Omit when there are none; do not pad. */
  alternateNames?: AlternateRhythmName[];
  /**
   * Genres, dances or ceremonies this rhythm belongs to. One to three comma-separated phrases,
   * most specific first, no terminal period.
   *
   * Names a musical context, not a region — the picker already groups by family and most rhythm
   * names carry their region. OMITTED when no source names a context; an empty field is honest,
   * a padded one is not.
   */
  usedIn?: string;
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
  ...MIDDLE_EASTERN_RHYTHMS,
  rockAndRoll: {
    id: 'rockAndRoll',
    name: 'Rock',
    description: 'The standard backbeat. At its simplest, low drum on beats 1 and 3, high on 2 and 4.',
    usedIn: 'Western pop and rock',
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
    description: 'Evenly spaced beats with no accents.',
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
    description: 'Evenly spaced beats counted in six, in two groups of three.',
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
      '4/4': ['baladi', 'helgertin', 'maqsum', 'saeidi'],
      '2/4': ['ayoub', 'daem', 'haddadi'],
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
