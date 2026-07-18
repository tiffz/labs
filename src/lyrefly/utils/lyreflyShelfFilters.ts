import type { ComicProject } from '../types';
import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';

export type LyreflyShelfViewMode = 'grid' | 'table';

export const LYREFLY_SHELF_VIEW_STORAGE_KEY = 'lyrefly.shelf.view';

/**
 * Shelf filters use workflow **stage** as progress.
 * Archived comics are hidden unless `showArchived` is on (Draft/WIP/Finished are not filter axes).
 */
export type LyreflyShelfFilterState = {
  stage: LyreflyWorkflowStage | '';
  query: string;
  showArchived: boolean;
};

export const EMPTY_LYREFLY_SHELF_FILTERS: LyreflyShelfFilterState = {
  stage: '',
  query: '',
  showArchived: false,
};

export type LyreflyShelfRow = {
  project: ComicProject;
  workflowStage: LyreflyWorkflowStage;
  publishLogCount: number;
  coverRevisionId?: string;
  conceptAssetId?: string;
};

export function readLyreflyShelfViewMode(): LyreflyShelfViewMode {
  try {
    return window.localStorage.getItem(LYREFLY_SHELF_VIEW_STORAGE_KEY) === 'table'
      ? 'table'
      : 'grid';
  } catch {
    return 'grid';
  }
}

export function writeLyreflyShelfViewMode(mode: LyreflyShelfViewMode): void {
  try {
    window.localStorage.setItem(LYREFLY_SHELF_VIEW_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function filterLyreflyShelfRows(
  rows: LyreflyShelfRow[],
  filters: LyreflyShelfFilterState,
): LyreflyShelfRow[] {
  const q = filters.query.trim().toLowerCase();
  return rows.filter(({ project, workflowStage }) => {
    if (!filters.showArchived && isLyreflyProjectArchived(project)) return false;
    if (filters.stage && workflowStage !== filters.stage) return false;
    if (!q) return true;
    return (
      project.title.toLowerCase().includes(q) ||
      (project.subtitle ?? '').toLowerCase().includes(q)
    );
  });
}

export type LyreflyShelfSortKey = 'title' | 'stage' | 'updatedAt' | 'pageCount';

export function sortLyreflyShelfRows(
  rows: LyreflyShelfRow[],
  sortKey: LyreflyShelfSortKey,
  direction: 'asc' | 'desc',
): LyreflyShelfRow[] {
  const mult = direction === 'asc' ? 1 : -1;
  const stageRank = (stage: LyreflyWorkflowStage): number =>
    LYREFLY_WORKFLOW_STAGES.findIndex((step) => step.id === stage);
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'title':
        cmp = a.project.title.localeCompare(b.project.title);
        break;
      case 'stage':
        cmp = stageRank(a.workflowStage) - stageRank(b.workflowStage);
        break;
      case 'updatedAt':
        cmp = a.project.updatedAt.localeCompare(b.project.updatedAt);
        break;
      case 'pageCount':
        cmp = (a.project.pageCount ?? 0) - (b.project.pageCount ?? 0);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp * mult;
    return a.project.title.localeCompare(b.project.title) * mult;
  });
}
