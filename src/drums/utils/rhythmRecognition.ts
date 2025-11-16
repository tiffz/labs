/**
 * Rhythm Recognition System
 * 
 * This module provides functionality to recognize common Middle Eastern rhythms
 * and their variations based on user input.
 */

import { RHYTHM_DATABASE } from '../data/rhythmDatabase';
import type { RhythmDefinition, RhythmVariation } from '../data/rhythmDatabase';

// Re-export types for convenience
export type { RhythmDefinition, RhythmVariation, LearnMoreLink } from '../data/rhythmDatabase';

/**
 * Normalizes a notation string for comparison
 * - Converts to uppercase
 * - Removes spaces and newlines
 */
function normalizeNotation(notation: string): string {
  return notation.toUpperCase().replace(/[\s\n]/g, '');
}

/**
 * Checks if the user's input matches any known rhythm pattern
 * Returns the matched rhythm definition and the specific variation that matched
 */
export function recognizeRhythm(
  userNotation: string
): { rhythm: RhythmDefinition; matchedVariation: RhythmVariation } | null {
  const normalizedInput = normalizeNotation(userNotation);
  
  if (!normalizedInput) {
    return null;
  }

  // Check each rhythm in the database
  for (const rhythm of Object.values(RHYTHM_DATABASE)) {
    // Check if the input matches any variation of this rhythm
    for (const variation of rhythm.variations) {
      const normalizedVariation = normalizeNotation(variation.notation);
      
      if (normalizedInput === normalizedVariation) {
        return {
          rhythm,
          matchedVariation: variation,
        };
      }
    }
  }

  return null;
}


