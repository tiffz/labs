/**
 * Rhythm Database
 * 
 * Contains definitions of common Middle Eastern rhythms and their variations.
 * This is used for rhythm recognition, providing educational information,
 * and populating the rhythm presets dropdown.
 */

import type { TimeSignature } from '../types';

export interface RhythmVariation {
  notation: string;
  note?: string; // Optional note about this specific variation
}

export interface LearnMoreLink {
  title: string;
  url: string;
}

export interface RhythmDefinition {
  name: string;
  description: string;
  learnMoreLinks: LearnMoreLink[];
  basePattern: string;
  timeSignature: TimeSignature;
  variations: RhythmVariation[];
}

/**
 * Database of known rhythms and their variations
 */
export const RHYTHM_DATABASE: Record<string, RhythmDefinition> = {
  maqsum: {
    name: 'Maqsum',
    description: 'A very common 4/4 rhythm in Middle Eastern drumming. This is typically the first rhythm students learn because of its straightforward pattern and versatility.',
    learnMoreLinks: [
      { title: 'Wikipedia: Maqsoum', url: 'https://en.wikipedia.org/wiki/Maqsoum' },
      { title: 'Darbuka Planet: Maqsum Rhythm', url: 'https://www.darbukaplanet.com/pages/darbuka-maqsum-rhythm' },
      { title: 'Mastering Darbuka Textbook', url: 'https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1' },
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
  ayoub: {
    name: 'Ayoub',
    description: 'An energetic 2/4 rhythm often used in fast-paced dance music.',
    learnMoreLinks: [
      { title: 'Darbuka Planet: Ayoub Rhythm', url: 'https://www.darbukaplanet.com/pages/ayoub-darbuka-rhythm' },
    ],
    basePattern: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'Used in the song "La Bass Fe Eyne"' },
    ],
  },
  saeidi: {
    name: 'Saeidi',
    description: 'An energetic 4/4 rhythm from Upper Egypt with two consecutive dum strokes that give it a grounded, earthy feel. Popular in folk music and stick dancing.',
    learnMoreLinks: [
      { title: 'Sharqi Dance: Saidi Rhythm', url: 'https://www.sharqidance.com/blog/saidi-rhythm' },
      { title: 'Mastering Darbuka Textbook', url: 'https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1' },
    ],
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
    name: 'Baladi',
    description: 'A core Egyptian 4/4 rhythm that starts with two dum strokes, giving it more weight than Maqsum. Essential for belly dance and Egyptian folk music.',
    learnMoreLinks: [
      { title: 'Wikipedia: Baladi', url: 'https://en.wikipedia.org/wiki/Baladi' },
      { title: 'Darbuka Planet: Baladi Rhythm', url: 'https://www.darbukaplanet.com/pages/baladi-rhythm' },
      { title: 'Mastering Darbuka Textbook', url: 'https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1' },
    ],
    basePattern: 'D-D-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    variations: [
      { notation: 'D-D-__T-D---T---' },
      { notation: 'D-D-__T-D-K-T-K-' },
      { notation: 'D-D-K-T-D-K-T---' },
      { notation: 'D-D-K-T-D-K-T-K-' },
    ],
  },
};

