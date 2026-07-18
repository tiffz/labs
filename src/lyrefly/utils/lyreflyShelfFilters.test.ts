import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import {
  filterLyreflyShelfRows,
  sortLyreflyShelfRows,
  type LyreflyShelfRow,
} from './lyreflyShelfFilters';

function row(
  title: string,
  overrides: Partial<LyreflyShelfRow['project']> & {
    workflowStage?: LyreflyShelfRow['workflowStage'];
  } = {},
): LyreflyShelfRow {
  const project = createBlankComicProject();
  project.title = title;
  if (overrides.status) project.status = overrides.status;
  if (overrides.updatedAt) project.updatedAt = overrides.updatedAt;
  if (overrides.pageCount != null) project.pageCount = overrides.pageCount;
  return {
    project,
    workflowStage: overrides.workflowStage ?? 'brainstorm',
    publishLogCount: 0,
  };
}

describe('lyreflyShelfFilters', () => {
  it('filters by stage and query; hides archived by default', () => {
    const rows = [
      row('Alpha', { status: 'draft', workflowStage: 'script' }),
      row('Beta', { status: 'finished', workflowStage: 'publish' }),
      row('Old', { status: 'archived', workflowStage: 'art' }),
    ];
    expect(filterLyreflyShelfRows(rows, { stage: '', query: '', showArchived: false })).toHaveLength(
      2,
    );
    expect(
      filterLyreflyShelfRows(rows, { stage: '', query: '', showArchived: true }).map(
        (r) => r.project.title,
      ),
    ).toEqual(['Alpha', 'Beta', 'Old']);
    expect(
      filterLyreflyShelfRows(rows, { stage: 'script', query: '', showArchived: false })[0]?.project
        .title,
    ).toBe('Alpha');
    expect(filterLyreflyShelfRows(rows, { stage: '', query: 'bet', showArchived: false })).toHaveLength(
      1,
    );
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
