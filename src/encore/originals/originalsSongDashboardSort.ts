import { isOriginalDemoReady, isStageComplete } from './originalsWorkflowCompletion';
import { ORIGINALS_WORKFLOW_STAGES } from './originalsWorkflowStages';
import type { EncoreOriginalSong } from './types';

/** Count of workflow stages marked complete (manual or heuristic). */
export function completedOriginalWorkflowStageCount(song: EncoreOriginalSong): number {
  return ORIGINALS_WORKFLOW_STAGES.filter((step) => isStageComplete(song, step.id)).length;
}

/**
 * Dashboard queue: pending originals first (least complete, then oldest update),
 * demo-ready originals last (oldest finished at the bottom).
 */
export function compareOriginalsForDashboardQueue(a: EncoreOriginalSong, b: EncoreOriginalSong): number {
  const aReady = isOriginalDemoReady(a);
  const bReady = isOriginalDemoReady(b);
  if (aReady !== bReady) return aReady ? 1 : -1;

  if (!aReady) {
    const stageDiff = completedOriginalWorkflowStageCount(a) - completedOriginalWorkflowStageCount(b);
    if (stageDiff !== 0) return stageDiff;
    return a.updatedAt.localeCompare(b.updatedAt);
  }

  // Demo-ready block at end — newest finished first, oldest last.
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function sortOriginalsForDashboardQueue(rows: EncoreOriginalSong[]): EncoreOriginalSong[] {
  return [...rows].sort(compareOriginalsForDashboardQueue);
}
