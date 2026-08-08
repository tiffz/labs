import type { PracticeItem, ScalesCustomRoutine, SessionPlan } from '../curriculum/types';
import { buildFreeSessionExercise } from './practiceItem';

/**
 * A one-item session for drilling a single user-chosen scale in isolation.
 * `kind: 'free'` tells the runtime this is not the curriculum: on completion it
 * returns home instead of chaining the next curriculum session, and its runs
 * are never recorded into `progress.exercises`.
 *
 * `now` is injected so callers/tests control `generatedAt` deterministically.
 */
export function planFreePracticeSession(item: PracticeItem, now: number): SessionPlan {
  return {
    kind: 'free',
    exercises: [buildFreeSessionExercise(item)],
    generatedAt: now,
  };
}

/**
 * A session that runs a routine's items in the exact order the user set — no
 * reordering, no app-added scales, no tempo ramps. `kind: 'routine'` shares the
 * same non-curriculum completion/recording behavior as free practice.
 */
export function planRoutineSession(routine: ScalesCustomRoutine, now: number): SessionPlan {
  return {
    kind: 'routine',
    exercises: routine.items.map(buildFreeSessionExercise),
    generatedAt: now,
  };
}
