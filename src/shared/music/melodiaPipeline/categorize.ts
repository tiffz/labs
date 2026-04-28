import type { NormalizedMelodiaExercise } from './types';
import { pickMelodyPart } from './partUtils';

export type DifficultyBucket = 'stepwise' | 'thirds' | 'fourths' | 'mixed';

const BUCKET_ORDER: readonly DifficultyBucket[] = ['stepwise', 'thirds', 'fourths', 'mixed'];

export interface CategorizedEntry {
  id: string;
  difficultyBucket: DifficultyBucket;
  maxIntervalSemitones: number;
  manualReview?: boolean;
  measure_count: number;
  melodiaLevel: number;
}

export interface LinearPathOutput {
  version: number;
  generatedBy: string;
  exerciseIds: string[];
  buckets: Record<DifficultyBucket, string[]>;
  categorized: CategorizedEntry[];
}

/**
 * Returns the largest absolute melodic interval (semitones) between
 * consecutive sounded notes in the melody part. Rests reset the previous
 * pitch so jumps across rests do not inflate the bucket.
 */
export function maxMelodicIntervalSemitones(exercise: NormalizedMelodiaExercise): number {
  const part = pickMelodyPart(exercise.score);
  let maxLeap = 0;
  let prev: number | null = null;
  for (const measure of part.measures) {
    for (const note of measure.notes) {
      if (note.rest || note.pitches.length === 0) {
        prev = null;
        continue;
      }
      const m = note.pitches[0];
      if (prev !== null) {
        const leap = Math.abs(m - prev);
        if (leap > maxLeap) maxLeap = leap;
      }
      prev = m;
    }
  }
  return maxLeap;
}

export function bucketForMaxInterval(maxLeap: number): DifficultyBucket {
  if (maxLeap <= 2) return 'stepwise';
  if (maxLeap <= 4) return 'thirds';
  if (maxLeap <= 5) return 'fourths';
  return 'mixed';
}

export function categorizeExercise(exercise: NormalizedMelodiaExercise): CategorizedEntry {
  const maxInterval = maxMelodicIntervalSemitones(exercise);
  return {
    id: exercise.id,
    difficultyBucket: bucketForMaxInterval(maxInterval),
    maxIntervalSemitones: maxInterval,
    manualReview: exercise.manualReview,
    measure_count: exercise.measure_count,
    melodiaLevel: exercise.melodiaLevel,
  };
}

/**
 * Categorize a list of exercises into difficulty buckets and produce a
 * `linearPath.json`-shaped output. Exercises flagged for manual review are
 * **excluded** from `exerciseIds`/`buckets` (still preserved in `categorized`
 * for diagnostics).
 *
 * Default ordering: stepwise → thirds → fourths → mixed; within a bucket,
 * preserve incoming order (which the caller can pre-sort by id, level, etc.).
 */
export function categorizeCorpus(
  exercises: readonly NormalizedMelodiaExercise[],
): LinearPathOutput {
  const categorized = exercises.map(categorizeExercise);
  const usable = categorized.filter((e) => !e.manualReview);
  const buckets: Record<DifficultyBucket, string[]> = {
    stepwise: [],
    thirds: [],
    fourths: [],
    mixed: [],
  };
  for (const entry of usable) {
    buckets[entry.difficultyBucket].push(entry.id);
  }
  const exerciseIds: string[] = [];
  for (const bucket of BUCKET_ORDER) {
    exerciseIds.push(...buckets[bucket]);
  }
  return {
    version: 1,
    generatedBy: 'categorize-corpus',
    exerciseIds,
    buckets,
    categorized,
  };
}
