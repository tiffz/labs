import type { TimeSignature } from './types';

export interface RhythmVariation {
  notation: string;
  note?: string;
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
    description: 'A 2/4 rhythm with a strong dum followed by two teks.',
    learnMoreLinks: [],
    basePattern: 'D--T--T-',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [
      { notation: 'D--T--T-' },
      { notation: 'D-KT-KT-' },
      { notation: 'DKKTKKTK' },
    ],
  },
  kahleegi: {
    id: 'kahleegi',
    name: 'Kahleegi',
    description: 'A 2/4 companion rhythm to Malfuf with a double dum opening.',
    learnMoreLinks: [],
    basePattern: 'D--D--T-',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [{ notation: 'D--D--T-' }, { notation: 'DK-D--K-' }],
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
  rhythm: Pick<RhythmDefinition, 'basePattern' | 'timeSignature'>,
  targetTimeSignature: TimeSignature
): string {
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
