import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import {
  EMPTY_LYREFLY_SHELF_FILTERS,
  filterLyreflyShelfRows,
  sortLyreflyShelfRows,
  type LyreflyShelfRow,
} from './lyreflyShelfFilters';

function row(
  title: string,
  overrides: Partial<LyreflyShelfRow['project']> & {
    workflowStage?: LyreflyShelfRow['workflowStage'];
    phase?: LyreflyShelfRow['phase'];
  } = {},
): LyreflyShelfRow {
  const project = createBlankComicProject();
  project.title = title;
  if (overrides.status) project.status = overrides.status;
  if (overrides.updatedAt) project.updatedAt = overrides.updatedAt;
  if (overrides.pageCount != null) project.pageCount = overrides.pageCount;
  if (overrides.mergedIntoId) project.mergedIntoId = overrides.mergedIntoId;
  return {
    project,
    workflowStage: overrides.workflowStage ?? 'brainstorm',
    publishLogCount: 0,
    phase: 'phase' in overrides ? (overrides.phase ?? null) : 'complete',
  };
}

describe('lyreflyShelfFilters', () => {
  it('shows complete comics by default; the switch shows the rest; archived stays hidden', () => {
    const rows = [
      row('Idea', { phase: 'idea' }),
      row('Drawing', { phase: 'developing' }),
      row('Not here yet', { phase: null }),
      row('Done', { phase: 'complete' }),
      row('Old', { status: 'archived', phase: 'complete' }),
    ];
    const titles = (f: Partial<typeof EMPTY_LYREFLY_SHELF_FILTERS>) =>
      filterLyreflyShelfRows(rows, { ...EMPTY_LYREFLY_SHELF_FILTERS, ...f }).map((r) => r.project.title);
    expect(titles({})).toEqual(['Done']);
    expect(titles({ showUnfinished: true })).toEqual(['Idea', 'Drawing', 'Not here yet', 'Done']);
    expect(titles({ showArchived: true })).toEqual(['Done', 'Old']);
    expect(titles({ showUnfinished: true, query: 'draw' })).toEqual(['Drawing']);
  });

  it('filters to one collection', () => {
    const rows = [row('In'), row('Out')];
    const byCollection = new Map([['c1', new Set([rows[0]!.project.id])]]);
    expect(
      filterLyreflyShelfRows(rows, { ...EMPTY_LYREFLY_SHELF_FILTERS, collectionId: 'c1' }, byCollection).map(
        (r) => r.project.title,
      ),
    ).toEqual(['In']);
  });

  it('never shows a work merged into another', () => {
    expect(filterLyreflyShelfRows([row('Gone', { mergedIntoId: 'x' })], EMPTY_LYREFLY_SHELF_FILTERS)).toEqual([]);
  });

  it('sorts by title and page count', () => {
    const rows = [row('B', { pageCount: 2 }), row('A', { pageCount: 10 })];
    expect(sortLyreflyShelfRows(rows, 'title', 'asc').map((r) => r.project.title)).toEqual([
      'A',
      'B',
    ]);
    expect(sortLyreflyShelfRows(rows, 'pageCount', 'desc')[0]?.project.pageCount).toBe(10);
  });
});
