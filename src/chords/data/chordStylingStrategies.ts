/**
 * Chord styling strategies metadata.
 *
 * Canonical location is `src/shared/music/chordStylingStrategies.ts`; this
 * module re-exports for backwards compatibility with in-app call sites.
 */

export type { ChordStylingStrategyConfig } from '../../shared/music/chordStylingStrategies';
export {
  CHORD_STYLING_STRATEGIES,
  getAvailableChordStyleTimeSignatures,
} from '../../shared/music/chordStylingStrategies';
