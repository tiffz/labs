import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type { ComicArchiveBinder, ComicProject, ScriptDocument } from '../types';
import type { LyreflyWorkflowStage } from './lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES, workflowStageIndex } from './lyreflyWorkflowStages';

const WORKFLOW_STAGE_IDS = new Set(LYREFLY_WORKFLOW_STAGES.map((step) => step.id));

export type LyreflyStageCompletionContext = {
  script?: ScriptDocument | null;
  visualDevCount?: number;
  pageNodeCount?: number;
  /** Any uploaded page revision (replaces legacy final-only count). */
  revisionCount?: number;
  archive?: ComicArchiveBinder | null;
  mockupCount?: number;
  characterCount?: number;
};

/** Manual override + stage heuristic only (no later-stage implication). */
export function isWorkflowStageCompleteDirect(
  project: ComicProject,
  stage: LyreflyWorkflowStage,
  ctx: LyreflyStageCompletionContext = {},
): boolean {
  const manual = project.stageCompletion?.[stage];
  if (manual === true) return true;
  if (manual === false) return false;

  switch (stage) {
    case 'brainstorm':
      return !isRichTextEmpty(project.brainstormHtml) || (ctx.visualDevCount ?? 0) > 0;
    case 'script':
      return Boolean(ctx.script?.markdown && !isRichTextEmpty(ctx.script.markdown));
    case 'thumbs':
      return (ctx.mockupCount ?? 0) > 0 || (ctx.characterCount ?? 0) > 0;
    case 'art':
      return (ctx.revisionCount ?? 0) > 0 || (ctx.pageNodeCount ?? 0) > 0;
    case 'publish':
      return (ctx.archive?.publishLog.length ?? 0) > 0;
    default:
      return false;
  }
}

/**
 * Stage complete for UI / inference. If any later stage is complete (direct), earlier stages
 * are treated as complete so the stepper and shelf do not strand the user on Brainstorm when
 * they already have Draw or Publish content.
 */
export function isWorkflowStageComplete(
  project: ComicProject,
  stage: LyreflyWorkflowStage,
  ctx: LyreflyStageCompletionContext = {},
): boolean {
  const index = workflowStageIndex(stage);
  if (index < 0) return false;
  for (let i = index + 1; i < LYREFLY_WORKFLOW_STAGES.length; i += 1) {
    const later = LYREFLY_WORKFLOW_STAGES[i]!.id;
    if (isWorkflowStageCompleteDirect(project, later, ctx)) return true;
  }
  return isWorkflowStageCompleteDirect(project, stage, ctx);
}

export function inferredWorkflowStage(
  project: ComicProject,
  ctx: LyreflyStageCompletionContext = {},
): LyreflyWorkflowStage {
  for (const step of LYREFLY_WORKFLOW_STAGES) {
    if (!isWorkflowStageComplete(project, step.id, ctx)) return step.id;
  }
  return 'publish';
}

export function isProjectReadyToShowcase(
  project: ComicProject,
  ctx: LyreflyStageCompletionContext = {},
): boolean {
  return LYREFLY_WORKFLOW_STAGES.every((step) => isWorkflowStageComplete(project, step.id, ctx));
}

export function toggleWorkflowStageCompletion(
  project: ComicProject,
  stage: LyreflyWorkflowStage,
  ctx: LyreflyStageCompletionContext = {},
): ComicProject {
  if (!WORKFLOW_STAGE_IDS.has(stage)) return project;
  const currentlyComplete = isWorkflowStageComplete(project, stage, ctx);
  const nextComplete = !currentlyComplete;
  const stageCompletion: NonNullable<ComicProject['stageCompletion']> = {
    ...project.stageCompletion,
  };
  stageCompletion[stage] = nextComplete;
  if (nextComplete) {
    const index = workflowStageIndex(stage);
    for (let i = 0; i < index; i += 1) {
      const earlier = LYREFLY_WORKFLOW_STAGES[i]!.id;
      if (WORKFLOW_STAGE_IDS.has(earlier)) {
        stageCompletion[earlier] = true;
      }
    }
  }
  return {
    ...project,
    stageCompletion,
    updatedAt: new Date().toISOString(),
  };
}
