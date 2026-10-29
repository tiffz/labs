import { describe, expect, it } from 'vitest';

import { createBlankComicProject, type ComicProject } from '../types';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import type { LyreflyShelfRow } from './lyreflyShelfFilters';
import { lyreflyWorkbenchColumns } from './lyreflyWorkbenchColumns';

function row(
  title: string,
  workflowStage: LyreflyWorkflowStage,
  patch: Partial<ComicProject> = {},
  publishLogCount = 0,
): LyreflyShelfRow {
  return { project: { ...createBlankComicProject(), title, ...patch }, workflowStage, publishLogCount };
}

const titles = (rows: LyreflyShelfRow[]) => rows.map((r) => r.project.title);

describe('lyreflyWorkbenchColumns', () => {
  it('puts each comic in the step it has reached, one column per step', () => {
    const columns = lyreflyWorkbenchColumns([row('A', 'brainstorm'), row('B', 'art'), row('C', 'script')]);
    expect(columns.map((c) => c.label)).toEqual(['Brainstorm', 'Script', 'Draw', 'Publish']);
    expect(columns.map((c) => titles(c.rows))).toEqual([['A'], ['C'], ['B'], []]);
  });

  it('leaves finished, published and archived comics on the shelf', () => {
    const columns = lyreflyWorkbenchColumns([
      row('Finished', 'publish', { status: 'finished' }),
      row('Published', 'publish', {}, 2),
      row('Archived', 'art', { status: 'archived' }),
      row('Waiting to post', 'publish'),
    ]);
    expect(columns.flatMap((c) => titles(c.rows))).toEqual(['Waiting to post']);
  });

  it('orders a column by priority, then by most recently touched', () => {
    const columns = lyreflyWorkbenchColumns([
      row('Old', 'script', { updatedAt: '2026-01-01T00:00:00Z' }),
      row('Second', 'script', { priorityRank: 2 }),
      row('New', 'script', { updatedAt: '2026-06-01T00:00:00Z' }),
      row('First', 'script', { priorityRank: 1 }),
    ]);
    expect(titles(columns[1]!.rows)).toEqual(['First', 'Second', 'New', 'Old']);
  });
});
