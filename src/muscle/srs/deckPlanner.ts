import type { MuscleMemoryNode, WorkoutProgress } from '../types/node';
import { isDue } from './sm2';

const MAX_NEW_PER_SESSION = 5;

export interface DeckPlan {
  queue: string[];
  dueCount: number;
  newCount: number;
}

export function buildDeckPlan(
  nodes: MuscleMemoryNode[],
  progressByNode: Map<string, WorkoutProgress>,
  now = Date.now(),
): DeckPlan {
  const due: string[] = [];
  const fresh: string[] = [];

  for (const node of nodes) {
    const progress = progressByNode.get(node.id);
    if (!progress || progress.state === 'new') {
      fresh.push(node.id);
      continue;
    }
    if (isDue(progress, now)) due.push(node.id);
  }

  due.sort((a, b) => (progressByNode.get(a)?.nextReviewDate ?? 0) - (progressByNode.get(b)?.nextReviewDate ?? 0));

  const newSlice = fresh.slice(0, MAX_NEW_PER_SESSION);
  const queue = [...due, ...newSlice];

  return { queue, dueCount: due.length, newCount: newSlice.length };
}

export function pickQuizChoices(
  targetId: string,
  pool: MuscleMemoryNode[],
  count = 4,
): string[] {
  const others = pool.filter((n) => n.id !== targetId);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const choices = [targetId, ...shuffled.slice(0, count - 1).map((n) => n.id)];
  return choices.sort(() => Math.random() - 0.5);
}

export function computeModuleMastery(
  nodes: MuscleMemoryNode[],
  progressByNode: Map<string, WorkoutProgress>,
  requiredReps = 3,
): { mastered: number; total: number } {
  const total = nodes.length;
  const mastered = nodes.filter(
    (n) => (progressByNode.get(n.id)?.repetitionCount ?? 0) >= requiredReps,
  ).length;
  return { mastered, total };
}
