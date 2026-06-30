import { getFundamentalsGateNodes } from '../curriculum';
import { getTermsGateIds } from '../curriculum/anatomyTerms';
import { muscleDb } from '../db/muscleDb';
import type { WorkoutProgress } from '../types/node';

/** Dev/e2e fixture — unlock fundamentals and torso active reps. */
export async function seedMuscleE2eGateUnlocked(): Promise<number> {
  await muscleDb.workoutProgress.clear();
  const rows: WorkoutProgress[] = [];

  for (const id of getTermsGateIds()) {
    rows.push({
      nodeId: id,
      state: 'review',
      interval: 6,
      repetitionCount: 3,
      easeFactor: 2.5,
      nextReviewDate: Date.now() - 1000,
    });
  }

  const bones = getFundamentalsGateNodes().filter((node) => node.type === 'bone');
  for (const node of bones.slice(0, 8)) {
    rows.push({
      nodeId: node.id,
      state: 'review',
      interval: 6,
      repetitionCount: 3,
      easeFactor: 2.5,
      nextReviewDate: Date.now() - 1000,
    });
  }

  await muscleDb.workoutProgress.bulkPut(rows);
  return rows.length;
}
