import type { MuscleMemoryNode, MuscleRegion, WorkoutProgress } from '../types/node';
import { getFundamentalsGateNodes, getNodesForRegion } from '../curriculum';
import { MUSCLE_MODULES } from '../curriculum/modules';

export const FUNDAMENTALS_BASELINE_REPS = 3;

export function getModuleProgressNodes(region: MuscleRegion): MuscleMemoryNode[] {
  return getNodesForRegion(region).filter((n) => n.isSurfaceForm);
}

export function fundamentalsGateSatisfied(
  progressByNode: Map<string, WorkoutProgress>,
): boolean {
  const gateNodes = getFundamentalsGateNodes();
  const mastered = gateNodes.filter(
    (n) => (progressByNode.get(n.id)?.repetitionCount ?? 0) >= FUNDAMENTALS_BASELINE_REPS,
  );
  return mastered.length >= Math.min(8, gateNodes.length);
}

export function isModuleUnlocked(
  moduleId: MuscleRegion,
  progressByNode: Map<string, WorkoutProgress>,
): boolean {
  const mod = MUSCLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return false;
  if (moduleId === 'fundamentals') return true;

  if (!fundamentalsGateSatisfied(progressByNode)) return false;

  return mod.prerequisiteModuleIds.every((pre) => {
    if (pre === 'fundamentals') return fundamentalsGateSatisfied(progressByNode);
    const nodes = getModuleProgressNodes(pre);
    if (nodes.length === 0) return true;
    const mastered = nodes.filter(
      (n) => (progressByNode.get(n.id)?.repetitionCount ?? 0) >= 2,
    ).length;
    return mastered / nodes.length >= 0.5;
  });
}

export function getModuleLockReason(
  moduleId: MuscleRegion,
  progressByNode: Map<string, WorkoutProgress>,
): string | null {
  if (isModuleUnlocked(moduleId, progressByNode)) return null;
  if (moduleId === 'fundamentals') return null;

  if (!fundamentalsGateSatisfied(progressByNode)) {
    return `Master ${FUNDAMENTALS_BASELINE_REPS} reps on core bones and joints in Fundamentals first.`;
  }

  const mod = MUSCLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return 'Module unavailable.';

  const blocked = mod.prerequisiteModuleIds.find((pre) => {
    const nodes = getModuleProgressNodes(pre);
    const mastered = nodes.filter(
      (n) => (progressByNode.get(n.id)?.repetitionCount ?? 0) >= 2,
    ).length;
    return nodes.length > 0 && mastered / nodes.length < 0.5;
  });

  if (blocked) {
    const label = MUSCLE_MODULES.find((m) => m.id === blocked)?.label ?? blocked;
    return `Finish half of ${label} before starting this module.`;
  }

  return 'Complete prerequisites to unlock active reps.';
}
