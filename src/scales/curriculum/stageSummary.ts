import type { Stage, Hand } from './types';

const HAND_LABEL: Record<Hand, string> = {
  right: 'right hand',
  left: 'left hand',
  both: 'both hands',
};

// Keyed as a plain map so Phase C's addition of 'triplet' to
// SubdivisionMode doesn't need a simultaneous update here.
const SUBDIVISION_LABEL: Record<string, string> = {
  none: 'quarter notes',
  eighth: 'eighth notes',
  triplet: 'triplets',
  sixteenth: 'sixteenth notes',
};

/**
 * Short human-readable summary of what a stage actually practices. Used by
 * the review dialog ("Sixteenth notes at 60 BPM, both hands") and the
 * session-complete chip so the celebratory moment carries real content
 * instead of a generic "stage complete" line.
 *
 * Deliberately terse — the stage's full label already appears elsewhere;
 * this is a sentence-fragment suitable for secondary text.
 */
export function formatStageSummary(stage: Stage): string {
  const hand = HAND_LABEL[stage.hand];
  // Free-tempo stages don't have a meaningful BPM. Subdivisions aren't
  // relevant when the metronome is off either — the grader counts notes,
  // not subdivisions.
  if (!stage.useTempo) {
    return `${hand}, free tempo`;
  }
  const subdivision = SUBDIVISION_LABEL[stage.subdivision] ?? 'quarter notes';
  return `${subdivision} at ${stage.bpm} BPM, ${hand}`;
}
