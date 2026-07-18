import type { ComicProject, LyreflyProjectStatus } from '../types';
import {
  isProjectReadyToShowcase,
  isWorkflowStageComplete,
  type LyreflyStageCompletionContext,
} from './lyreflyWorkflowCompletion';
import { LYREFLY_WORKFLOW_STAGES } from './lyreflyWorkflowStages';

/**
 * Cohesive shelf/progress model:
 * - **Progress** = workflow stage (Brainstorm → Publish)
 * - **Lifecycle** = Active vs Archived only (Draft / In progress / Finished are derived, not filtered)
 */

export function isLyreflyProjectArchived(project: ComicProject): boolean {
  return project.status === 'archived';
}

/** Derive legacy status from stage completion for Drive/summary compatibility. */
export function deriveLyreflyProjectStatus(
  project: ComicProject,
  ctx: LyreflyStageCompletionContext = {},
): LyreflyProjectStatus {
  if (project.status === 'archived') return 'archived';
  if (isProjectReadyToShowcase(project, ctx) || isWorkflowStageComplete(project, 'publish', ctx)) {
    return 'finished';
  }
  const anyProgress = LYREFLY_WORKFLOW_STAGES.some((step) =>
    isWorkflowStageComplete(project, step.id, ctx),
  );
  return anyProgress ? 'wip' : 'draft';
}

export function withSyncedLyreflyProjectStatus(
  project: ComicProject,
  ctx: LyreflyStageCompletionContext = {},
): ComicProject {
  const next = deriveLyreflyProjectStatus(project, ctx);
  if (next === project.status) return project;
  return { ...project, status: next };
}
