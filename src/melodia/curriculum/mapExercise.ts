import type { MelodiaCurriculumExercise } from '../../shared/music/melodiaPipeline/types';
import type { MelodiaExercise } from '../types';

export function curriculumEntryToExercise(entry: MelodiaCurriculumExercise): MelodiaExercise {
  return {
    id: entry.id,
    score: entry.score,
    sourceHash: entry.sourceOmHash ?? 'catalog',
    fileName: entry.title ?? entry.id,
    bookRef: String(entry.book),
    number: entry.number,
  };
}
