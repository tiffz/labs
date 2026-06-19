import Dexie, { type Table } from 'dexie';
import type { WorkoutProgress } from '../types/node';

export class MuscleDB extends Dexie {
  workoutProgress!: Table<WorkoutProgress, string>;

  constructor() {
    super('muscle-memory');
    this.version(1).stores({
      workoutProgress: 'nodeId, state, nextReviewDate',
    });
  }
}

export const muscleDb = new MuscleDB();

export async function loadAllProgress(): Promise<Map<string, WorkoutProgress>> {
  const rows = await muscleDb.workoutProgress.toArray();
  return new Map(rows.map((row) => [row.nodeId, row]));
}

export async function saveProgress(progress: WorkoutProgress): Promise<void> {
  await muscleDb.workoutProgress.put(progress);
}
