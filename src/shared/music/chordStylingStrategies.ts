/**
 * Time-signature-aware metadata for chord styling strategies.
 *
 * The underlying pattern strings live in `chordStylingPatterns.ts`; this
 * module exposes which time signatures each strategy supports so pickers
 * can filter options and callers can validate user choices.
 *
 * Credit: Strategy taxonomy inspired by the Piano for Singers course by
 * Brenda Earle Stokes — https://pianoandvoicewithbrenda.com/piano-for-singers-the-complete-guide/
 */

import type { ChordStylingStrategy, TimeSignature } from './chordTypes';
import { CHORD_STYLING_PATTERNS, keyToTimeSignature } from './chordStylingPatterns';

export interface ChordStylingStrategyConfig {
  name: string;
  description: string;
  compatibleTimeSignatures: TimeSignature[];
  attribution?: string;
}

function getCompatibleTimeSignatures(
  strategy: ChordStylingStrategy
): TimeSignature[] {
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

/**
 * Returns the de-duplicated set of time signatures that at least one
 * chord styling strategy supports, sorted by denominator then numerator.
 */
export function getAvailableChordStyleTimeSignatures(): TimeSignature[] {
  const seen = new Set<string>();
  Object.values(CHORD_STYLING_STRATEGIES).forEach((config) => {
    config.compatibleTimeSignatures.forEach((ts) => {
      seen.add(`${ts.numerator}/${ts.denominator}`);
    });
  });
  return Array.from(seen)
    .map((str) => {
      const [num, den] = str.split('/').map(Number);
      return { numerator: num, denominator: den };
    })
    .sort((a, b) => {
      if (a.denominator !== b.denominator) return a.denominator - b.denominator;
      return a.numerator - b.numerator;
    });
}
