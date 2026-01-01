/**
 * Chord styling utilities for generating different chord patterns
 * Based on Piano for Singers course strategies
 * Supports variants for different time signatures
 */

import type { Chord, ChordStylingStrategy, TimeSignature } from '../types';
import { validateMeasureDurations } from './durationValidation';

export interface StyledChordNotes {
  bassNotes: Array<{ notes: number[]; duration: string }>; // Array of bass note groups with durations
  trebleNotes: Array<{ notes: number[]; duration: string }>; // Array of treble note groups with durations
}

/**
 * Checks if two time signatures are equal
 */
function timeSignatureEquals(ts1: TimeSignature, ts2: TimeSignature): boolean {
  return ts1.numerator === ts2.numerator && ts1.denominator === ts2.denominator;
}

/**
 * Generates styled chord notes based on the styling strategy and time signature
 * Validates durations to ensure they add up correctly
 */
export function generateStyledChordNotes(
  chord: Chord,
  trebleVoicing: number[],
  bassVoicing: number[],
  strategy: ChordStylingStrategy,
  timeSignature: TimeSignature
): StyledChordNotes {
  const rootNote = bassVoicing[0]; // Root note for bass
  const trebleNotes = trebleVoicing; // Full chord for treble

  let result: StyledChordNotes;

  switch (strategy) {
    case 'simple': {
      // One chord per measure - bass plays root, treble plays full chord
      result = {
        bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
        trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
      };
      break;
    }

    case 'one-per-beat': {
      // One chord per beat (or beat group for compound time)
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // 4/4: one chord per quarter note (4 beats)
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 3, denominator: 4 })) {
        // 3/4: one chord per quarter note (3 beats)
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 2, denominator: 4 })) {
        // 2/4: one chord per quarter note (2 beats)
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 6, denominator: 8 })) {
        // 6/8: one chord per dotted quarter (beat group) = 2 beats
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 12, denominator: 8 })) {
        // 12/8: one chord per dotted quarter (beat group) = 4 beats
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'oom-pahs': {
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // Standard 4/4 oom-pahs: root on beats 1 and 3 (half notes)
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'h' },
            { notes: [rootNote], duration: 'h' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'h' },
            { notes: trebleNotes, duration: 'h' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 2, denominator: 4 })) {
        // 2/4 variant: simpler pattern - root on beat 1 (half note)
        result = {
          bassNotes: [{ notes: [rootNote], duration: 'h' }],
          trebleNotes: [{ notes: trebleNotes, duration: 'h' }],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'waltz': {
      if (timeSignatureEquals(timeSignature, { numerator: 3, denominator: 4 })) {
        // Standard 3/4 waltz: root on each beat in bass, chord on beat 1 only in treble
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: [], duration: 'qr' }, // Rest
            { notes: [], duration: 'qr' }, // Rest
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 6, denominator: 8 })) {
        // 6/8 variant: waltz feel with dotted quarter notes
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: 'qdr' }, // Rest
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'pop-rock-ballad': {
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // Standard 4/4 pop-rock ballad: dotted quarter pattern
        // qd (1.5) + 8r (0.5) + qd (1.5) + 8r (0.5) = 4 beats ✓
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' }, // Eighth rest
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' }, // Eighth rest
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 6, denominator: 8 })) {
        // 6/8 variant: dotted quarter feel (3+3 pattern)
        // qd (3 eighth notes) + 8r (1 eighth) + qd (3 eighth notes) = 7 eighth notes
        // Need to fix: qd (3) + 8r (1) + 8 (1) + 8r (1) = 6 eighth notes ✓
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: [rootNote], duration: '8' },
            { notes: [], duration: '8r' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: '8' },
            { notes: [], duration: '8r' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 12, denominator: 8 })) {
        // 12/8 variant: dotted quarter feel (3+3+3+3 pattern)
        // qd (3 eighth notes) + 8r (1 eighth) repeated 3 times = 12 eighth notes ✓
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'pop-rock-uptempo': {
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // Standard 4/4 pop-rock uptempo: syncopated pattern
        // q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + q (1) = 3.5 beats - WRONG!
        // Fixed: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + 8 (0.5) = 3 beats - still wrong
        // Better: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + q (1) + 8r (0.5) = 4 beats ✓
        // Actually, let's use: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + 8 (0.5) + 8r (0.5) = 3.5 beats
        // Let's simplify: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + q (1) = 3.5 beats
        // Fixed version: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + 8 (0.5) + 8r (0.5) = 3.5 beats
        // Actually correct: q (1) + 8r (0.5) + 8 (0.5) + 8r (0.5) + q (1) + 8r (0.5) = 4 beats ✓
        return {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [], duration: '8r' },
            { notes: [rootNote], duration: '8' },
            { notes: [], duration: '8r' },
            { notes: [rootNote], duration: 'q' },
            { notes: [], duration: '8r' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: '8' },
            { notes: [], duration: '8r' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'q' },
            { notes: [], duration: '8r' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 2, denominator: 4 })) {
        // 2/4 variant: simplified pattern
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'q' },
            { notes: trebleNotes, duration: 'q' },
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'jazzy': {
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // Standard 4/4 jazzy: walking bass line
        const third = trebleNotes[1] || rootNote + 4;
        const fifth = trebleNotes[2] || rootNote + 7;
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'q' },
            { notes: [third], duration: 'q' },
            { notes: [fifth], duration: 'q' },
            { notes: [third], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'h' },
            { notes: trebleNotes, duration: 'h' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 12, denominator: 8 })) {
        // 12/8 variant: swing feel with walking bass
        // qd (3) + 8r (1) + qd (3) + 8r (1) + qd (3) + 8r (1) = 12 eighth notes ✓
        const third = trebleNotes[1] || rootNote + 4;
        const fifth = trebleNotes[2] || rootNote + 7;
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: [third], duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: [fifth], duration: 'qd' },
            { notes: [], duration: '8r' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: [], duration: '8r' },
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    case 'tresillo': {
      if (timeSignatureEquals(timeSignature, { numerator: 4, denominator: 4 })) {
        // Standard 4/4 tresillo: 3+3+2 pattern
        // qd (3 eighth notes) + qd (3 eighth notes) + q (2 eighth notes) = 8 eighth notes = 4 beats ✓
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'q' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'q' },
          ],
        };
      } else if (timeSignatureEquals(timeSignature, { numerator: 12, denominator: 8 })) {
        // 12/8 variant: tresillo feel
        // qd (3 eighth notes) + qd (3 eighth notes) + qd (3 eighth notes) + qd (3 eighth notes) = 12 eighth notes ✓
        result = {
          bassNotes: [
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
            { notes: [rootNote], duration: 'qd' },
          ],
          trebleNotes: [
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
            { notes: trebleNotes, duration: 'qd' },
          ],
        };
      } else {
        // Fallback to simple
        result = {
          bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
          trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
        };
      }
      break;
    }

    default:
      // Default to simple
      result = {
        bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
        trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
      };
  }

  // Validate durations
  const bassDurations = result.bassNotes.map(n => n.duration);
  const trebleDurations = result.trebleNotes.map(n => n.duration);
  
  const bassValidation = validateMeasureDurations(bassDurations, timeSignature);
  const trebleValidation = validateMeasureDurations(trebleDurations, timeSignature);
  
  if (!bassValidation.isValid || !trebleValidation.isValid) {
    console.warn('Duration validation failed:', {
      bass: bassValidation,
      treble: trebleValidation,
      strategy,
      timeSignature,
    });
    // Fallback to simple if validation fails
    return {
      bassNotes: [{ notes: [rootNote], duration: getMeasureDuration(timeSignature) }],
      trebleNotes: [{ notes: trebleNotes, duration: getMeasureDuration(timeSignature) }],
    };
  }
  
  return result;
}

/**
 * Gets the duration string for a whole measure based on time signature
 */
function getMeasureDuration(timeSignature: TimeSignature): string {
  if (timeSignature.numerator === 4 && timeSignature.denominator === 4) {
    return 'w';
  }
  if (timeSignature.numerator === 3 && timeSignature.denominator === 4) {
    return 'hd';
  }
  if (timeSignature.numerator === 2 && timeSignature.denominator === 4) {
    return 'h';
  }
  if (timeSignature.numerator === 6 && timeSignature.denominator === 8) {
    return 'hd';
  }
  if (timeSignature.numerator === 12 && timeSignature.denominator === 8) {
    return 'w';
  }
  return 'w';
}
