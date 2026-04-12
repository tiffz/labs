import type { PianoScore } from '../../shared/music/scoreTypes';
import type { SessionExercise, ExerciseKind } from './types';
import type { Subdivision, ExerciseType } from '../../shared/music/scales';
import { generateExerciseScore } from '../../shared/music/scales';

function kindToQuality(kind: ExerciseKind): 'major' | 'minor' {
  if (kind === 'natural-minor-scale' || kind === 'arpeggio-minor') return 'minor';
  return 'major';
}

function kindToExerciseType(kind: ExerciseKind): ExerciseType {
  if (kind === 'arpeggio-major' || kind === 'arpeggio-minor') return 'arpeggio';
  return 'scale';
}

function subdivisionToNumber(sub: SessionExercise['subdivision']): Subdivision {
  if (sub === 'eighth') return 2;
  if (sub === 'sixteenth') return 4;
  return 1;
}

/**
 * Generate a PianoScore for a session exercise.
 * Produces an ascending-and-descending pattern for one octave.
 */
export function generateScoreForExercise(exercise: SessionExercise): PianoScore | null {
  const quality = kindToQuality(exercise.kind);
  const exType = kindToExerciseType(exercise.kind);
  const sub = subdivisionToNumber(exercise.subdivision);

  const score = generateExerciseScore(quality, exType, exercise.key, 'both', 1, sub);
  if (!score) return null;

  const effectiveTempo = exercise.bpm || 80;

  const filteredParts = exercise.hand === 'both'
    ? score.parts
    : score.parts.filter(p => p.hand === exercise.hand);

  return {
    ...score,
    id: `scales-${exercise.exerciseId}-${exercise.stageId}`,
    tempo: effectiveTempo,
    parts: filteredParts.length > 0 ? filteredParts : score.parts,
  };
}
