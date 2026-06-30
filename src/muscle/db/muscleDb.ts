import Dexie, { type Table } from 'dexie';
import type { ModuleGuideProgress, WorkoutProgress } from '../types/node';

export class MuscleDB extends Dexie {
  workoutProgress!: Table<WorkoutProgress, string>;
  moduleGuideProgress!: Table<ModuleGuideProgress, string>;
  quizPreferences!: Table<{ moduleId: string; quizMode: string }, string>;

  constructor() {
    super('muscle-memory');
    this.version(1).stores({
      workoutProgress: 'nodeId, state, nextReviewDate',
    });
    this.version(2).stores({
      workoutProgress: 'nodeId, state, nextReviewDate',
      moduleGuideProgress: 'moduleId, phase',
      quizPreferences: 'moduleId',
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

export async function loadModuleGuideProgress(): Promise<Map<string, ModuleGuideProgress>> {
  const rows = await muscleDb.moduleGuideProgress.toArray();
  return new Map(rows.map((row) => [row.moduleId, row]));
}

export async function saveModuleGuideProgress(progress: ModuleGuideProgress): Promise<void> {
  await muscleDb.moduleGuideProgress.put(progress);
}

export async function loadQuizModePreference(moduleId: string): Promise<string | null> {
  const row = await muscleDb.quizPreferences.get(moduleId);
  return row?.quizMode ?? null;
}

export async function saveQuizModePreference(moduleId: string, quizMode: string): Promise<void> {
  await muscleDb.quizPreferences.put({ moduleId, quizMode });
}
