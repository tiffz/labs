import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type { ComicArchiveBinder, ComicProject, ScriptDocument } from '../types';
import type { LyreflyWorkflowStage } from './lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from './lyreflyWorkflowStages';

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

export function isWorkflowStageComplete(
  project: ComicProject,
  stage: LyreflyWorkflowStage,
  ctx: LyreflyStageCompletionContext = {},
): boolean {
  const manual = project.stageCompletion?.[stage];
  if (manual === true) return true;
  if (manual === false) return false;

  switch (stage) {
    case 'brainstorm':
      return (
        !isRichTextEmpty(project.brainstormHtml) ||
        (ctx.visualDevCount ?? 0) > 0
      );
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
  const currentlyComplete = isWorkflowStageComplete(project, stage, ctx);
  return {
    ...project,
    stageCompletion: {
      ...project.stageCompletion,
      [stage]: !currentlyComplete,
    },
    updatedAt: new Date().toISOString(),
  };
}
