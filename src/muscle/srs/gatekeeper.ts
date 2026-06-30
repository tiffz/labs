import type { MuscleMemoryNode, MuscleRegion, WorkoutProgress } from '../types/node';
import { getTermsGateIds, TERMS_GATE_REPS } from '../curriculum/anatomyTerms';
import { getFundamentalsGateNodes, getNodesForRegion } from '../curriculum';
import { MUSCLE_MODULES } from '../curriculum/modules';

export const FUNDAMENTALS_BASELINE_REPS = 3;
export const TERMS_BASELINE_REPS = TERMS_GATE_REPS;

export function getModuleProgressNodes(region: MuscleRegion): MuscleMemoryNode[] {
  return getNodesForRegion(region).filter((n) => n.isSurfaceForm && !n.atlasOnly);
}

export function termsGateSatisfied(progressByNode: Map<string, WorkoutProgress>): boolean {
  const gateIds = getTermsGateIds();
  const mastered = gateIds.filter(
    (id) => (progressByNode.get(id)?.repetitionCount ?? 0) >= TERMS_BASELINE_REPS,
  );
  return mastered.length >= Math.min(6, gateIds.length);
}

export function fundamentalsGateSatisfied(
  progressByNode: Map<string, WorkoutProgress>,
): boolean {
  if (!termsGateSatisfied(progressByNode)) return false;
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
  if (moduleId === 'anatomy_terms') return true;
  if (moduleId === 'fundamentals') return termsGateSatisfied(progressByNode);

  if (!fundamentalsGateSatisfied(progressByNode)) return false;

  return mod.prerequisiteModuleIds.every((pre) => {
    if (pre === 'anatomy_terms') return termsGateSatisfied(progressByNode);
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
  if (moduleId === 'anatomy_terms') return null;

  if (moduleId === 'fundamentals' && !termsGateSatisfied(progressByNode)) {
    return `Master ${TERMS_BASELINE_REPS} reps on core anatomy terms first.`;
  }

  if (!fundamentalsGateSatisfied(progressByNode)) {
    if (!termsGateSatisfied(progressByNode)) {
      return `Master ${TERMS_BASELINE_REPS} reps on core anatomy terms first.`;
    }
    return `Master ${FUNDAMENTALS_BASELINE_REPS} reps on skeletal landmarks in Skeletal landmarks first.`;
  }

  const mod = MUSCLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return 'Module unavailable.';

  const blocked = mod.prerequisiteModuleIds.find((pre) => {
    if (pre === 'anatomy_terms' || pre === 'fundamentals') return false;
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
