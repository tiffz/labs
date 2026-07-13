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

  it('does not match Cover.png to Back Cover via substring', () => {
    const nodes = [
      node('front', 'Front Cover'),
      node('back', 'Back Cover'),
    ];
    const cover = parsePageFile(new File([''], 'Cover.png', { type: 'image/png' }));
    expect(findPageNodeForParsedFile(cover, nodes)?.id).toBe('front');
  });

  it('matches shorthand Cover and Back display names', () => {
    const nodes = [
      node('front', 'Cover'),
      node('p1', 'Page 1'),
      node('back', 'Back'),
    ];
    const files = ['Cover.png', '1.png', 'Back.png'].map(
      (name) => parsePageFile(new File([''], name, { type: 'image/png' })),
    );
    const { matches } = matchParsedFilesToPageNodes(files, nodes);
    expect(matches.map((match) => match.node.id).sort()).toEqual(['back', 'front', 'p1']);
  });

  it('matches a full uploaded page set by name', () => {
    const nodes = [
      node('front', 'Front Cover'),
      ...Array.from({ length: 6 }, (_, index) => node(`p${index + 1}`, `Page ${index + 1}`)),
      node('back', 'Back Cover'),
    ];
    const files = ['Cover.png', '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', 'Back.png'].map(
      (name) => parsePageFile(new File([''], name, { type: 'image/png' })),
    );
    const { matches, unmatchedFiles } = matchParsedFilesToPageNodes(files, nodes);
    expect(unmatchedFiles).toHaveLength(0);
    expect(matches).toHaveLength(8);
    expect(matches.find((match) => match.parsed.originalName === 'Cover.png')?.node.id).toBe('front');
    expect(matches.find((match) => match.parsed.originalName === 'Back.png')?.node.id).toBe('back');
  });
});
