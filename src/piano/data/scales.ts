// Re-export from shared module — piano-internal imports remain unchanged.
export type { Direction, ExerciseType, Subdivision } from '../../shared/music/scales';
export {
  MAJOR_KEYS, MINOR_KEYS, CHROMATIC_NOTES,
  generateExerciseScore, generateChromaticScore, DEFAULT_SCORE,
} from '../../shared/music/scales';
