/**
 * Live mesh inventory for ?debug — updated by FullBodyRegionModel.
 */
import {
  REQUIRED_FULL_BODY_BONE_IDS,
  REQUIRED_FULL_BODY_MUSCLE_IDS,
} from '../anatomy/requiredMeshIds';

export type MuscleAnatomyDebugSnapshot = {
  anatomyNodeIds: string[];
  updatedAt: number;
};

let snapshot: MuscleAnatomyDebugSnapshot = {
  anatomyNodeIds: [],
  updatedAt: 0,
};

const listeners = new Set<() => void>();

export function getMuscleAnatomyDebugSnapshot(): MuscleAnatomyDebugSnapshot {
  return snapshot;
}

export function setMuscleAnatomyDebugAnatomy(nodeIds: readonly string[]): void {
  snapshot = {
    ...snapshot,
    anatomyNodeIds: [...new Set(nodeIds)].sort(),
    updatedAt: Date.now(),
  };
  for (const listener of listeners) listener();
}

export function subscribeMuscleAnatomyDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

declare global {
  interface Window {
    __MUSCLE_ANATOMY_DEBUG__?: MuscleAnatomyDebugSnapshot;
  }
}

export function publishMuscleAnatomyDebugWindow(): void {
  if (typeof window === 'undefined') return;
  const snapshot = getMuscleAnatomyDebugSnapshot();
  window.__MUSCLE_ANATOMY_DEBUG__ = snapshot;
  window.__LABS_DEBUG__ = {
    muscleAnatomy: snapshot,
    missingRequiredBones: REQUIRED_FULL_BODY_BONE_IDS.filter(
      (id) => !snapshot.anatomyNodeIds.includes(id),
    ),
    missingRequiredMuscles: REQUIRED_FULL_BODY_MUSCLE_IDS.filter(
      (id) => !snapshot.anatomyNodeIds.includes(id),
    ),
  };
}
