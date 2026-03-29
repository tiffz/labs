import type { TimeSignature } from './chordTypes';

export interface ChordPatternConfig {
  treble: string;
  bass: string;
}

export interface ChordStylingPattern {
  name: string;
  description: string;
  patterns: Record<string, ChordPatternConfig>;
  attribution?: string;
}

export function timeSignatureToKey(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

export function keyToTimeSignature(key: string): TimeSignature {
  const [numerator, denominator] = key.split('/').map(Number);
  return { numerator, denominator };
}

export const CHORD_STYLING_PATTERNS: Record<string, ChordStylingPattern> = {
  simple: {
    name: 'Simple',
    description: 'One chord per measure',
    patterns: {
      '4/4': { treble: 'C---------------', bass: '1---------------' },
      '3/4': { treble: 'C-----------', bass: '1-----------' },
      '2/4': { treble: 'C-------', bass: '1-------' },
      '6/8': { treble: 'C-----C-----', bass: '1-----1-----' },
      '12/8': { treble: 'C-----C-----C-----C-----', bass: '1-----1-----1-----1-----' },
    },
  },
  'one-per-beat': {
    name: 'One Per Beat',
    description: 'One chord per beat (or beat group for compound time)',
    patterns: {
      '4/4': { treble: 'C---C---C---C---', bass: '1---------------' },
      '3/4': { treble: 'C---C---C---', bass: '1-----------' },
      '2/4': { treble: 'C---C---', bass: '1-------' },
      '6/8': { treble: 'C-C-C-C-C-C-', bass: '1-----------' },
      '12/8': { treble: 'C-C-C-C-C-C-C-C-C-C-C-C-', bass: '1-----------------------' },
    },
  },
  'half-notes': {
    name: 'Half Notes',
    description: 'One chord every other beat',
    patterns: {
      '4/4': { treble: 'C-------C-------', bass: '1---------------' },
      '3/4': { treble: 'C-------C---', bass: '1-----------' },
      '2/4': { treble: 'C-------', bass: '1-------' },
      '6/8': { treble: 'C-----C-----', bass: '1-----------' },
      '12/8': { treble: 'C-----C-----C-----C-----', bass: '1-----------------------' },
    },
  },
  'eighth-notes': {
    name: 'Eighth Notes',
    description: 'Two chord hits per beat',
    patterns: {
      '4/4': { treble: 'C-C-C-C-C-C-C-C-', bass: '1-1-1-1-1-1-1-1-' },
      '3/4': { treble: 'C-C-C-C-C-C-', bass: '1-1-1-1-1-1-' },
      '2/4': { treble: 'C-C-C-C-', bass: '1-1-1-1-' },
      '6/8': { treble: 'C-C-C-C-C-C-', bass: '1-1-1-1-1-1-' },
      '12/8': { treble: 'C-C-C-C-C-C-C-C-C-C-C-C-', bass: '1-1-1-1-1-1-1-1-1-1-1-1-' },
    },
  },
  'oom-pahs': {
    name: 'Oom-Pahs',
    description:
      'Alternating root/chord pattern (LH/RH). Works well for Music Theater, Jazz Ballads, or any song in 4/4 time.',
    patterns: {
      '4/4': { treble: '____C---____C---', bass: '1---____5---____' },
      '2/4': { treble: '____C---', bass: '1---____' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  waltz: {
    name: 'Waltz',
    description: '3/4 time pattern with root or root/5th in left hand',
    patterns: {
      '3/4': { treble: '____C---C---', bass: '1-----------' },
      '6/8': { treble: '__C-C-__C-C-', bass: '1-----1-----' },
      '12/8': { treble: '__C-C-__C-C-__C-C-__C-C-', bass: '1-----1-----1-----1-----' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-ballad': {
    name: 'Pop-Rock Ballad',
    description: 'Dotted quarter note pattern in left hand with chords in right hand',
    patterns: {
      '4/4': { treble: 'C---C---C---C---', bass: '1-----1-1-----1-' },
      '2/4': { treble: 'C---C---', bass: '1-----1-' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-uptempo': {
    name: 'Pop-Rock Up Tempo',
    description: 'Driving rhythm with syncopated bass pattern',
    patterns: {
      '4/4': { treble: '____C---____C---', bass: '1-----1-1-----1-' },
      '2/4': { treble: '____C---', bass: '1-----1-' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  jazzy: {
    name: 'Jazzy',
    description: 'Walking bass line (1-3-5-3) with rhythm chords in right hand. Play with a swing feel.',
    patterns: {
      '4/4': { treble: 'C-C-____________', bass: '1---3---5---3---' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  tresillo: {
    name: 'The Tresillo',
    description:
      'The pattern 3+3+2 (1 2 3 - 1 2 3 - 1 2). One of the most widely played grooves across many styles.',
    patterns: {
      '4/4': { treble: 'C-----C-----C---', bass: '1-----1-----1---' },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
};
