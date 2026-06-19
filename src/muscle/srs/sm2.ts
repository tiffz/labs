import type { WorkoutProgress } from '../types/node';

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;

export type Sm2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function createInitialProgress(nodeId: string, now = Date.now()): WorkoutProgress {
  return {
    nodeId,
    state: 'new',
    interval: 0,
    repetitionCount: 0,
    easeFactor: DEFAULT_EASE,
    nextReviewDate: now,
  };
}

/** Map quiz outcome to SM-2 quality (0–5). */
export function qualityFromCorrect(correct: boolean): Sm2Quality {
  return correct ? 5 : 2;
}

export function applySm2Grade(
  progress: WorkoutProgress,
  quality: Sm2Quality,
  now = Date.now(),
): WorkoutProgress {
  if (quality < 3) {
    return {
      ...progress,
      state: 'learning',
      interval: 0,
      repetitionCount: 0,
      nextReviewDate: now,
    };
  }

  let { repetitionCount, interval, easeFactor, state } = progress;

  easeFactor = Math.max(MIN_EASE, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (state === 'new' || state === 'learning') {
    repetitionCount += 1;
    if (repetitionCount === 1) {
      interval = 1;
      state = 'learning';
    } else if (repetitionCount === 2) {
      interval = 3;
      state = 'learning';
    } else {
      interval = 6;
      state = 'review';
    }
  } else {
    repetitionCount += 1;
    interval = Math.round(interval * easeFactor);
    state = 'review';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return {
    ...progress,
    state,
    repetitionCount,
    interval,
    easeFactor,
    nextReviewDate: now + interval * dayMs,
  };
}

export function isDue(progress: WorkoutProgress, now = Date.now()): boolean {
  return progress.nextReviewDate <= now;
}
