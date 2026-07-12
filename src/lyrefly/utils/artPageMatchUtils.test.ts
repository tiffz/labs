import { describe, expect, it } from 'vitest';

import { parsePageFile } from '../../shared/zine/pageFileParser';
import { findPageNodeForParsedFile, matchParsedFilesToPageNodes } from './artPageMatchUtils';
import type { PageNode } from '../types';

function node(id: string, displayName: string, isSpread = false): PageNode {
  return {
    id,
    projectId: 'p1',
    displayName,
    isSpread,
    activeRevisionId: null,
    revisionIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('artPageMatchUtils', () => {
  const pageNodes = [
    node('front', 'Front Cover'),
    node('p1', 'Page 1'),
    node('back', 'Back Cover'),
  ];

  it('matches cover and back files by booklet labels', () => {
    const cover = parsePageFile(new File([''], 'Cover.png', { type: 'image/png' }));
    const back = parsePageFile(new File([''], 'back.png', { type: 'image/png' }));

    expect(findPageNodeForParsedFile(cover, pageNodes)?.id).toBe('front');
    expect(findPageNodeForParsedFile(back, pageNodes)?.id).toBe('back');
  });

  it('does not pair files by grid index order', () => {
    const files = [
      new File([''], 'back.png', { type: 'image/png' }),
      new File([''], 'Cover.png', { type: 'image/png' }),
    ];
    const parsed = files.map(parsePageFile);
    const { matches } = matchParsedFilesToPageNodes(parsed, pageNodes);

    expect(matches.map((match) => match.node.id).sort()).toEqual(['back', 'front']);
  });
});
