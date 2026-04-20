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
  // Subdivision 3 is triplets — `generateExerciseScore` already emits the
  // correct `tuplet: { actual: 3, normal: 2 }` metadata and builds 12
  // notes per 4/4 measure. The playback engine and metronome gained
  // triplet awareness in Phase C.
  if (sub === 'triplet') return 3;
  if (sub === 'sixteenth') return 4;
  return 1;
}

/**
 * Generate a PianoScore for a session exercise.
 * Honours the stage's octave span (1 or 2) so later-stage 2-octave work
 * reuses the same interval/fingering expansion as standalone scale
 * practice.
 */
export function generateScoreForExercise(exercise: SessionExercise): PianoScore | null {
  const quality = kindToQuality(exercise.kind);
  const exType = kindToExerciseType(exercise.kind);
  const sub = subdivisionToNumber(exercise.subdivision);

  const score = generateExerciseScore(quality, exType, exercise.key, 'both', exercise.octaves, sub);
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
