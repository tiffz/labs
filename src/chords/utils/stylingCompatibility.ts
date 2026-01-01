/**
 * Utilities for checking styling strategy compatibility with time signatures
 */

import type { TimeSignature, ChordStylingStrategy } from '../types';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';

/**
 * Gets all styling strategies compatible with a time signature
 */
export function getCompatibleStylingStrategies(timeSignature: TimeSignature): ChordStylingStrategy[] {
  return Object.entries(CHORD_STYLING_STRATEGIES)
    .filter(([, config]) => 
      config.compatibleTimeSignatures.some(
        ts => ts.numerator === timeSignature.numerator && ts.denominator === timeSignature.denominator
      )
    )
    .map(([key]) => key as ChordStylingStrategy);
}

