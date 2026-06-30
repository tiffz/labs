import type { BodyView, MuscleRegion } from '../types/node';

/** Stable key for which 3D asset tree is mounted (full-body atlas vs one regional GLB). */
export function anatomySceneKey(bodyView: BodyView, activeModuleId: MuscleRegion): string {
  return bodyView === 'full_body' ? 'full_body' : `region:${activeModuleId}`;
}
