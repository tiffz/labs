/**
 * Chord styling strategies based on Piano for Singers course
 * 
 * This file now just provides metadata. The actual patterns are defined in
 * chordStylingPatterns.ts using human-readable notation.
 * 
 * Credit: These chord styling strategies are inspired by the Piano for Singers course
 * by Brenda Earle Stokes. Learn more at: https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/
 */

import type { ChordStylingStrategy, TimeSignature } from '../types';
import { CHORD_STYLING_PATTERNS, keyToTimeSignature } from '../../shared/music/chordStylingPatterns';

export interface ChordStylingStrategyConfig {
  name: string;
  description: string;
  compatibleTimeSignatures: TimeSignature[];
  attribution?: string;
}

/**
 * Generate compatible time signatures from patterns
 */
function getCompatibleTimeSignatures(strategy: ChordStylingStrategy): TimeSignature[] {
  const patternConfig = CHORD_STYLING_PATTERNS[strategy];
  if (!patternConfig) return [];
  
  return Object.keys(patternConfig.patterns).map(keyToTimeSignature);
}

const strategyEntries = Object.entries(CHORD_STYLING_PATTERNS).map(
  ([strategy, config]) => [
    strategy as ChordStylingStrategy,
    {
      name: config.name,
      description: config.description,
      compatibleTimeSignatures: getCompatibleTimeSignatures(
        strategy as ChordStylingStrategy
      ),
      attribution: config.attribution,
    } satisfies ChordStylingStrategyConfig,
  ]
);

export const CHORD_STYLING_STRATEGIES = Object.fromEntries(
  strategyEntries
) as Record<ChordStylingStrategy, ChordStylingStrategyConfig>;

