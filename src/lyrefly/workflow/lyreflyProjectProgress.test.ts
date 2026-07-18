import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import { deriveLyreflyProjectStatus } from './lyreflyProjectProgress';

describe('lyreflyProjectProgress', () => {
  it('keeps archived as archived', () => {
    const project = createBlankComicProject();
    project.status = 'archived';
    expect(deriveLyreflyProjectStatus(project, { pageNodeCount: 4 })).toBe('archived');
  });

  it('derives draft / wip / finished from stage progress', () => {
    const empty = createBlankComicProject();
    expect(deriveLyreflyProjectStatus(empty)).toBe('draft');

    const drawing = createBlankComicProject();
    expect(deriveLyreflyProjectStatus(drawing, { pageNodeCount: 2 })).toBe('wip');

    const published = createBlankComicProject();
    expect(
      deriveLyreflyProjectStatus(published, {
        archive: {
          id: 'a',
          projectId: published.id,
          publishLog: [
            {
              id: 'p',
              platform: 'Web',
              publishedAt: published.createdAt,
            },
          ],
          pressEntries: [],
          salesLedger: [],
        },
      }),
    ).toBe('finished');
  });
});
