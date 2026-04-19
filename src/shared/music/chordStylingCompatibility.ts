/**
 * Utilities for checking chord styling strategy compatibility with time
 * signatures. Shared across apps so chord style pickers can filter
 * consistently.
 */

import type { ChordStylingStrategy, TimeSignature } from './chordTypes';
import { CHORD_STYLING_STRATEGIES } from './chordStylingStrategies';

/**
 * Gets all styling strategies compatible with a time signature.
 */
export function getCompatibleStylingStrategies(
  timeSignature: TimeSignature
): ChordStylingStrategy[] {
  return Object.entries(CHORD_STYLING_STRATEGIES)
    .filter(([, config]) =>
      config.compatibleTimeSignatures.some(
        (ts) =>
          ts.numerator === timeSignature.numerator &&
          ts.denominator === timeSignature.denominator
      )
    )
    .map(([key]) => key as ChordStylingStrategy);
}

/**
 * Returns true when the given strategy has at least one pattern defined
 * for the given time signature.
 */
export function isStrategyCompatibleWithTimeSignature(
  strategy: ChordStylingStrategy,
  timeSignature: TimeSignature
): boolean {
  const config = CHORD_STYLING_STRATEGIES[strategy];
  if (!config) return false;
  return config.compatibleTimeSignatures.some(
    (ts) =>
      ts.numerator === timeSignature.numerator &&
      ts.denominator === timeSignature.denominator
  );
}
