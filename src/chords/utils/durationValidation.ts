/**
 * Utilities for validating and calculating note durations (chords app adapter).
 * Canonical VexFlow duration math: `src/shared/notation/vexFlowDuration.ts`.
 */

import type { TimeSignature } from '../types';
import { vexFlowDurationToBeats } from '../../shared/notation/vexFlowDuration';

/** @deprecated Prefer {@link vexFlowDurationToBeats} from shared notation. */
export const durationToBeats = vexFlowDurationToBeats;

export { vexFlowDurationToBeats };

/**
 * Validates that durations add up to the correct number of beats for a measure
 */
export function validateMeasureDurations(
  durations: string[],
  timeSignature: TimeSignature
): { isValid: boolean; totalBeats: number; expectedBeats: number } {
  const totalBeats = durations.reduce((sum, duration) => {
    return sum + vexFlowDurationToBeats(duration, timeSignature.denominator);
  }, 0);

  const expectedBeats = timeSignature.numerator;

  return {
    isValid: Math.abs(totalBeats - expectedBeats) < 0.01,
    totalBeats,
    expectedBeats,
  };
}
