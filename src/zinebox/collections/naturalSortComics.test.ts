import { describe, expect, it } from 'vitest';

import type { ZineboxComic } from '../types';
import { extractIssueNumber, sortComicIdsNatural } from './naturalSortComics';

function comic(id: string, title: string, filename?: string): ZineboxComic {
  return {
    id,
    title,
    filename,
    source: 'Test',
    fileId: `file-${id}`,
    coverThumbnailBase64: '',
    readStatus: 'unread',
    progressPercentage: 0,
  };
}

describe('extractIssueNumber', () => {
  it('extracts from filename', () => {
    expect(extractIssueNumber({ title: 'Night Market', filename: 'issue-12.pdf' })).toBe(12);
  });

  it('falls back to title', () => {
    expect(extractIssueNumber({ title: 'Issue 03 — Night Market' })).toBe(3);
  });
});

describe('sortComicIdsNatural', () => {
  it('sorts by issue number', () => {
    const map = new Map([
      ['a', comic('a', 'Issue 10', 'issue-10.pdf')],
      ['b', comic('b', 'Issue 2', 'issue-2.pdf')],
      ['c', comic('c', 'Issue 1', 'issue-1.pdf')],
    ]);
    expect(sortComicIdsNatural(map, ['a', 'b', 'c'])).toEqual(['c', 'b', 'a']);
  });

  it('respects customSortOrder when present', () => {
    const map = new Map([
      ['a', comic('a', 'Issue 1')],
      ['b', comic('b', 'Issue 2')],
      ['c', comic('c', 'Issue 3')],
    ]);
    expect(sortComicIdsNatural(map, ['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });
});
