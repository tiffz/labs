import { getFundamentalsGateNodes } from '../curriculum';
import { muscleDb } from '../db/muscleDb';
import type { WorkoutProgress } from '../types/node';

/** Dev/e2e fixture — unlock torso active reps by mastering fundamentals gate bones. */
export async function seedMuscleE2eGateUnlocked(): Promise<number> {
  await muscleDb.workoutProgress.clear();
  const bones = getFundamentalsGateNodes().filter((node) => node.type === 'bone');
  const rows: WorkoutProgress[] = bones.slice(0, 8).map((node) => ({
    nodeId: node.id,
    state: 'review',
    interval: 6,
    repetitionCount: 3,
    easeFactor: 2.5,
    nextReviewDate: Date.now() - 1000,
  }));
  await muscleDb.workoutProgress.bulkPut(rows);
  return rows.length;
}
