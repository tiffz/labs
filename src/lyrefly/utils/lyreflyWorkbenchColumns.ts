import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';
import type { LyreflyShelfRow } from './lyreflyShelfFilters';

export type LyreflyWorkbenchColumn = {
  stage: LyreflyWorkflowStage;
  label: string;
  rows: LyreflyShelfRow[];
};

/** Done work belongs on the shelf, not the board: finished, published at least once, or archived. */
export function isLyreflyComicInProgress(row: LyreflyShelfRow): boolean {
  if (isLyreflyProjectArchived(row.project)) return false;
  if (row.project.status === 'finished') return false;
  return row.publishLogCount === 0;
}

/**
 * The Workbench board: one column per workflow step, each comic in the step it has reached.
 * The column comes from the comic's own content, so it cannot drift from what the comic holds.
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
