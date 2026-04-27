import type {
  ExerciseDefinition,
  Hand,
  Stage,
} from '../curriculum/types';
import {
  CONCEPT_INTROS,
  triggerConcepts,
  type ConceptIntro,
  type ConceptKey,
} from '../curriculum/concepts';
import type { IntroducedConcepts, ScalesProgressData } from '../progress/types';

/**
 * What the guidance modal renders: one-shot **concept** intros only
 * (free tempo, metronome, what a pentascale is, thumb-under, etc.).
 *
 * **Fingering + video links** stay next to the score in SessionScreen
 * (`resolveHandGuidance`) so learners can reread them while looking at
 * the notation.
 */
export interface GuidancePayload {
  concepts: ConceptIntro[];
}

/**
 * Resolve the per-hand guidance text from an exercise definition. A
 * string applies to all three hands; an object maps per-hand and
 * falls back gracefully when the requested hand is missing.
 */
export function resolveHandGuidance(
  exercise: ExerciseDefinition,
  hand: Hand,
): string | null {
  const g = exercise.guidance;
  if (!g) return null;
  if (typeof g === 'string') return g;
  return g[hand] ?? null;
}

/**
 * Compute the modal guidance payload: concepts the current stage
 * triggers that the user has not yet acknowledged.
 */
export function computeGuidance(
  stage: Stage,
  exercise: ExerciseDefinition,
  progress: ScalesProgressData,
): GuidancePayload {
  const introducedConcepts: IntroducedConcepts = progress.introducedConcepts ?? {};

  const triggered = new Set<ConceptKey>(triggerConcepts(stage, exercise));
  const concepts: ConceptIntro[] = [];
  for (const key of Object.keys(CONCEPT_INTROS) as ConceptKey[]) {
    if (!triggered.has(key)) continue;
    if (introducedConcepts[key]) continue;
    concepts.push(CONCEPT_INTROS[key]);
  }

  return { concepts };
}

/**
 * True when there is nothing left to show in the onboarding modal.
 */
export function isGuidancePayloadEmpty(payload: GuidancePayload): boolean {
  return payload.concepts.length === 0;
}
