import type { LyreflyShelfPreview } from '../hooks/useLyreflyShelfPreviews';
import type { ComicProject } from '../types';
import type { LyreflyWorkPhase } from '../workflow/lyreflyWorkPhase';
import { isLyreflyProjectArchived } from '../workflow/lyreflyProjectProgress';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LYREFLY_WORKFLOW_STAGES } from '../workflow/lyreflyWorkflowStages';

export type LyreflyShelfViewMode = 'grid' | 'table';

export const LYREFLY_SHELF_VIEW_STORAGE_KEY = 'lyrefly.shelf.view';

/**
 * The Library is for finished work: complete comics only, unless `showUnfinished` is on (ADR 0031).
 * Archived comics are hidden unless `showArchived` is on.
 */
export type LyreflyShelfFilterState = {
  showUnfinished: boolean;
  /** Only comics in this collection; '' for all. */
  collectionId: string;
  query: string;
  showArchived: boolean;
};

export const EMPTY_LYREFLY_SHELF_FILTERS: LyreflyShelfFilterState = {
  showUnfinished: false,
  collectionId: '',
  query: '',
  showArchived: false,
};

export type LyreflyShelfRow = {
  project: ComicProject;
  workflowStage: LyreflyWorkflowStage;
  publishLogCount: number;
  /** From `lyreflyWorkPhase`; null while the package is not on this device. */
  phase: LyreflyWorkPhase | null;
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
  /** Comic ids in each collection, for the collection filter. */
  workIdsByCollection: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): LyreflyShelfRow[] {
  const q = filters.query.trim().toLowerCase();
  return rows.filter(({ project, phase }) => {
    if (project.mergedIntoId) return false;
    if (!filters.showArchived && isLyreflyProjectArchived(project)) return false;
    if (!filters.showUnfinished && phase !== 'complete') return false;
    if (filters.collectionId && !workIdsByCollection.get(filters.collectionId)?.has(project.id)) return false;
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

/** One row per project, from the shelf previews. A project with no preview yet has an unknown phase. */
export function buildLyreflyShelfRows(
  projects: readonly ComicProject[],
  previewByProject: ReadonlyMap<string, LyreflyShelfPreview>,
): LyreflyShelfRow[] {
  return projects.map((project) => {
    const preview = previewByProject.get(project.id);
    return {
      project,
      workflowStage: preview?.workflowStage ?? 'brainstorm',
      publishLogCount: preview?.publishLogCount ?? 0,
      phase: preview ? preview.phase : null,
      coverRevisionId: preview?.coverRevisionId,
      conceptAssetId: preview?.conceptAssetId,
    };
  });
}
