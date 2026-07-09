import type { ComicProject } from '../types';
import { inferredWorkflowStage, type LyreflyStageCompletionContext } from './lyreflyWorkflowCompletion';
import type { LyreflyWorkflowStage } from './lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from './lyreflyWorkflowStages';

const KEY_PREFIX = 'lyrefly-workflow-stage:';

function storageKey(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

export function readPersistedWorkflowStage(
  projectId: string,
  project: ComicProject,
  ctx: LyreflyStageCompletionContext = {},
): LyreflyWorkflowStage {
  if (typeof window === 'undefined') return inferredWorkflowStage(project, ctx);
  try {
    const raw = window.sessionStorage.getItem(storageKey(projectId));
    if (!raw) return inferredWorkflowStage(project, ctx);
    const match = LYREFLY_WORKFLOW_STAGES.find((s) => s.id === raw);
    return match?.id ?? inferredWorkflowStage(project, ctx);
  } catch {
    return inferredWorkflowStage(project, ctx);
  }
}

export function persistWorkflowStage(projectId: string, stage: LyreflyWorkflowStage): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(projectId), stage);
  } catch {
    /* quota */
  }
}
