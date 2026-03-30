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
}

export interface RhythmTemplatePreset {
  id: string;
  label: string;
  notation: string;
  timeSignature: TimeSignature;
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
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'La Bass Fe Eyne variation' },
    ],
  },
  malfuf: {
    id: 'malfuf',
    name: 'Malfuf',
    description: 'An 8/8 rhythm with a strong dum followed by two teks (3+3+2 feel).',
    learnMoreLinks: [],
    basePattern: 'D-----T-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--T--T-',
    variations: [
      { notation: 'D-----T-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-D-K-K-T-K-', note: '8/8 with ka ornaments', timeSignature: { numerator: 8, denominator: 8 } },
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
    variations: [
      { notation: 'D---D---D---D---' },
      { notation: 'D-------D-------' },
      { notation: 'D-T-D-T-D-T-D-T-' },
      { notation: 'D-D-D-D-D-D-D-D-' },
      { notation: 'T-K-T-K-T-K-T-K-' },
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

export function getPresetNotation(
  rhythm: Pick<RhythmDefinition, 'basePattern' | 'timeSignature' | 'fourFourMappingPattern'>,
  targetTimeSignature: TimeSignature
): string {
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

export function getRhythmTemplatePresets(
  targetTimeSignature: TimeSignature = { numerator: 4, denominator: 4 }
): RhythmTemplatePreset[] {
  return Object.values(RHYTHM_DATABASE).map((rhythm) => ({
    id: rhythm.id,
    label: rhythm.name,
    notation: getPresetNotation(rhythm, targetTimeSignature),
    timeSignature: targetTimeSignature,
  }));
}
