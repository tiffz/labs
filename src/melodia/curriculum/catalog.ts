import type { MelodiaCurriculumExercise } from '../../shared/music/melodiaPipeline/types';

const modules = import.meta.glob<{ default: MelodiaCurriculumExercise }>('./data/*.json', {
  eager: true,
  import: 'default',
});

function loadAll(): MelodiaCurriculumExercise[] {
  const list = Object.values(modules) as unknown as MelodiaCurriculumExercise[];
  return list.sort((a, b) => a.book - b.book || a.number - b.number);
}

let cached: MelodiaCurriculumExercise[] | null = null;

export function getMelodiaCatalog(): MelodiaCurriculumExercise[] {
  if (!cached) cached = loadAll();
  return cached;
}

export function getMelodiaExerciseById(id: string): MelodiaCurriculumExercise | undefined {
  return getMelodiaCatalog().find((e) => e.id === id);
}
