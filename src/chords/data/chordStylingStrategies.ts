/**
 * Chord styling strategies based on Piano for Singers course
 * 
 * Credit: These chord styling strategies are inspired by the Piano for Singers course
 * by Brenda Earle Stokes. Learn more at: https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/
 */

import type { ChordStylingStrategy, TimeSignature } from '../types';

export interface ChordStylingStrategyConfig {
  name: string;
  description: string;
  compatibleTimeSignatures: TimeSignature[];
  attribution?: string;
}

export const CHORD_STYLING_STRATEGIES: Record<ChordStylingStrategy, ChordStylingStrategyConfig> = {
  simple: {
    name: 'Simple',
    description: 'One chord per measure',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 2, denominator: 4 },
      { numerator: 6, denominator: 8 },
      { numerator: 12, denominator: 8 },
    ],
  },
  'one-per-beat': {
    name: 'One Per Beat',
    description: 'One chord per beat (or beat group for compound time)',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 2, denominator: 4 },
      { numerator: 6, denominator: 8 },
      { numerator: 12, denominator: 8 },
    ],
  },
  'oom-pahs': {
    name: 'Oom-Pahs',
    description: 'Alternating root/chord pattern (LH/RH). Works well for Music Theater, Jazz Ballads, or any song in 4/4 time.',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 2, denominator: 4 }, // Variant: simpler oom-pah for 2/4
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  waltz: {
    name: 'Waltz',
    description: '3/4 time pattern with root or root/5th in left hand',
    compatibleTimeSignatures: [
      { numerator: 3, denominator: 4 },
      { numerator: 6, denominator: 8 }, // Variant: waltz feel in 6/8
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-ballad': {
    name: 'Pop-Rock Ballad',
    description: 'Dotted quarter note pattern in left hand with chords in right hand',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 6, denominator: 8 }, // Variant: dotted quarter feel in 6/8
      { numerator: 12, denominator: 8 }, // Variant: dotted quarter feel in 12/8
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-uptempo': {
    name: 'Pop-Rock Up Tempo',
    description: 'Driving rhythm with syncopated bass pattern',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 2, denominator: 4 }, // Variant: simplified for 2/4
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  jazzy: {
    name: 'Jazzy',
    description: 'Walking bass line (1-3-5-3) with rhythm chords in right hand. Play with a swing feel.',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 12, denominator: 8 }, // Variant: swing feel in 12/8
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  tresillo: {
    name: 'The Tresillo',
    description: 'The pattern 3+3+2 (1 2 3 - 1 2 3 - 1 2). One of the most widely played grooves across many styles.',
    compatibleTimeSignatures: [
      { numerator: 4, denominator: 4 },
      { numerator: 12, denominator: 8 }, // Variant: tresillo feel in 12/8
    ],
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
};

