import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';
import type { LyreflyShelfRow } from './lyreflyShelfFilters';

export type LyreflyWorkbenchColumn = {
  stage: LyreflyWorkflowStage;
  label: string;
  rows: LyreflyShelfRow[];
};

/** The board holds works being developed: ideas live in the Sketchbook, done work on the shelf. */
export function isLyreflyComicInProgress(row: LyreflyShelfRow): boolean {
  if (isLyreflyProjectArchived(row.project) || row.project.mergedIntoId) return false;
  return row.phase === 'developing';
}

/**
 * The Workbench board: one column per workflow step, each comic in the step it has reached.
 * Which works appear comes from `lyreflyWorkPhase`; the column from the comic's own content.
 * Within a column, an explicit priority comes first, then whatever was touched most recently.
 */
export function lyreflyWorkbenchColumns(rows: readonly LyreflyShelfRow[]): LyreflyWorkbenchColumn[] {
  const active = rows.filter(isLyreflyComicInProgress);
  return LYREFLY_WORKFLOW_STAGES.map((step) => ({
    stage: step.id,
    label: step.label,
    rows: active
      .filter((row) => row.workflowStage === step.id)
      .sort(
        (a, b) =>
          (a.project.priorityRank ?? Number.POSITIVE_INFINITY) - (b.project.priorityRank ?? Number.POSITIVE_INFINITY) ||
          b.project.updatedAt.localeCompare(a.project.updatedAt),
      ),
  }));
}
