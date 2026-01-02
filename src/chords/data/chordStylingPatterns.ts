/**
 * Chord Styling Patterns Configuration
 * 
 * Human-readable configuration for chord styling strategies.
 * Each strategy has configurations keyed by time signature.
 * 
 * Notation System (similar to darbuka app):
 * - Each character represents a 16th note
 * - Numbers (1, 3, 5, etc.) = play individual notes (scale degrees: 1=root, 3=third, 5=fifth)
 * - 'C' = play entire chord
 * - '_' = rest (silence)
 * - '-' = continue previous note (extends duration)
 * 
 * Examples:
 * - 'C---' = chord held for quarter note (4 sixteenths)
 * - '1-3-5-C' = root (8th), third (8th), fifth (8th), chord (8th)
 * - '_C-_C-' = rest (8th), chord (8th), rest (8th), chord (8th)
 * 
 * Time Signature Format: "numerator/denominator" (e.g., "4/4", "3/4", "6/8")
 */

import type { TimeSignature } from '../types';

export interface ChordPatternConfig {
  treble: string; // Notation pattern for treble clef
  bass: string;   // Notation pattern for bass clef
}

export interface ChordStylingPattern {
  name: string;
  description: string;
  patterns: Record<string, ChordPatternConfig>; // Keyed by time signature string (e.g., "4/4")
  attribution?: string;
}

/**
 * Convert TimeSignature to string key
 */
export function timeSignatureToKey(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

/**
 * Convert string key to TimeSignature
 */
export function keyToTimeSignature(key: string): TimeSignature {
  const [numerator, denominator] = key.split('/').map(Number);
  return { numerator, denominator };
}

/**
 * Chord styling patterns configuration
 * Easy to edit - just add new entries or modify existing patterns
 */
export const CHORD_STYLING_PATTERNS: Record<string, ChordStylingPattern> = {
  simple: {
    name: 'Simple',
    description: 'One chord per measure',
    patterns: {
      '4/4': {
        treble: 'C---------------', // Whole note chord (16 sixteenths)
        bass: '1---------------',   // Whole note root (16 sixteenths)
      },
      '3/4': {
        treble: 'C-----------', // Dotted half chord (12 sixteenths)
        bass: '1-----------',   // Dotted half root (12 sixteenths)
      },
      '2/4': {
        treble: 'C-------', // Half note chord (8 sixteenths)
        bass: '1-------',   // Half note root (8 sixteenths)
      },
      '6/8': {
        // Converted from 3/4: halve durations (dotted half -> dotted quarter) and repeat 2x
        treble: 'C-----C-----', // Dotted quarter (6), dotted quarter (6) = 12 sixteenths
        bass: '1-----1-----',   // Dotted quarter (6), dotted quarter (6) = 12 sixteenths
      },
      '12/8': {
        // Converted from 3/4: halve durations (dotted half -> dotted quarter) and repeat 4x
        treble: 'C-----C-----C-----C-----', // Four dotted quarter chords (24 sixteenths)
        bass: '1-----1-----1-----1-----',   // Four dotted quarter roots (24 sixteenths)
      },
    },
  },
  'one-per-beat': {
    name: 'One Per Beat',
    description: 'One chord per beat (or beat group for compound time)',
    patterns: {
      '4/4': {
        treble: 'C---C---C---C---', // 4 quarter note chords
        bass: '1---1---1---1---',   // 4 quarter note roots
      },
      '3/4': {
        treble: 'C---C---C---', // 3 quarter note chords
        bass: '1---1---1---',   // 3 quarter note roots
      },
      '2/4': {
        treble: 'C---C---', // 2 quarter note chords
        bass: '1---1---',   // 2 quarter note roots
      },
      '6/8': {
        // Converted from 3/4: halve durations (quarter -> eighth) and repeat 2x
        treble: 'C-C-C-C-C-C-', // 6 eighth notes (2 sixteenths each) = 12 sixteenths
        bass: '1-1-1-1-1-1-',   // 6 eighth notes (2 sixteenths each) = 12 sixteenths
      },
      '12/8': {
        // Converted from 3/4: halve durations (quarter -> eighth) and repeat 4x
        treble: 'C-C-C-C-C-C-C-C-C-C-C-C-', // 12 eighth notes (2 sixteenths each) = 24 sixteenths
        bass: '1-1-1-1-1-1-1-1-1-1-1-1-',   // 12 eighth notes (2 sixteenths each) = 24 sixteenths
      },
    },
  },
  'oom-pahs': {
    name: 'Oom-Pahs',
    description: 'Alternating root/chord pattern (LH/RH). Works well for Music Theater, Jazz Ballads, or any song in 4/4 time.',
    patterns: {
      '4/4': {
        // Treble: rest on beat 1, chord on beat 2, rest on beat 3, chord on beat 4
        treble: '____C---____C---', // Quarter rest, quarter chord, quarter rest, quarter chord
        // Bass: root on beat 1, rest on beat 2, root on beat 3, rest on beat 4
        bass: '1---____5---____',    // Quarter root, quarter rest, quarter root, quarter rest
      },
      '2/4': {
        // Simplified for 2/4: same pattern but only 2 beats
        treble: '____C---', // Quarter rest, quarter chord
        bass: '1---____',    // Quarter root
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  waltz: {
    name: 'Waltz',
    description: '3/4 time pattern with root or root/5th in left hand',
    patterns: {
      '3/4': {
        // Treble: rest on beat 1, chord on beat 2, chord on beat 3
        treble: '____C---C---', // Quarter rest (4), quarter chord (4), quarter chord (4) = 12 sixteenths
        // Bass: dotted half root (held for entire measure)
        bass: '1-----------', // Dotted half root (12 sixteenths)
      },
      '6/8': {
        // Converted from 3/4: halve durations and repeat 2x
        // Treble: rest (2), chord (2), chord (2) = 6 sixteenths, repeat 2x = 12 sixteenths
        treble: '__C-C-__C-C-', // Eighth rest, eighth chord, eighth chord, repeated twice
        // Bass: dotted quarter (6), repeated 2x = 12 sixteenths
        bass: '1-----1-----', // Dotted quarter root, dotted quarter root
      },
      '12/8': {
        // Converted from 3/4: halve durations and repeat 4x
        // Treble: rest (2), chord (2), chord (2) = 6 sixteenths, repeat 4x = 24 sixteenths
        treble: '__C-C-__C-C-__C-C-__C-C-', // Eighth rest, eighth chord, eighth chord, repeated four times
        // Bass: dotted quarter (6), repeated 4x = 24 sixteenths
        bass: '1-----1-----1-----1-----', // Four dotted quarter roots
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-ballad': {
    name: 'Pop-Rock Ballad',
    description: 'Dotted quarter note pattern in left hand with chords in right hand',
    patterns: {
      '4/4': {
        treble: 'C---C---C---C---',
        bass: '1-----1-1-----1-',  
      },
      '2/4': {
        treble: 'C---C---',
        bass: '1-----1-',  
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  'pop-rock-uptempo': {
    name: 'Pop-Rock Up Tempo',
    description: 'Driving rhythm with syncopated bass pattern',
    patterns: {
      '4/4': {
        treble: '____C---____C---', 
        bass: '1-----1-1-----1-',
      },
      '2/4': {
        treble: '____C---', 
        bass: '1-----1-',
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  jazzy: {
    name: 'Jazzy',
    description: 'Walking bass line (1-3-5-3) with rhythm chords in right hand. Play with a swing feel.',
    patterns: {
      '4/4': {
        treble: 'C-C-____________',
        bass: '1---3---5---3---',
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
  tresillo: {
    name: 'The Tresillo',
    description: 'The pattern 3+3+2 (1 2 3 - 1 2 3 - 1 2). One of the most widely played grooves across many styles.',
    patterns: {
      '4/4': {
        treble: 'C-----C-----C---', // Dotted quarter, dotted quarter, quarter
        bass: '1-----1-----1---',   // Same pattern in bass
      },
    },
    attribution: 'Strategy from Piano for Singers course by Brenda Earle Stokes',
  },
};

