import { describe, expect, it } from 'vitest';

import { splitLyreflySearchHighlight } from './lyreflySearchHighlight';

describe('splitLyreflySearchHighlight', () => {
  it('returns plain text when query is empty', () => {
    expect(splitLyreflySearchHighlight('Eliza Wish', '')).toEqual([
      { kind: 'text', value: 'Eliza Wish' },
    ]);
  });

  it('highlights case-insensitive matches', () => {
    expect(splitLyreflySearchHighlight('Eliza Wish', 'wish')).toEqual([
      { kind: 'text', value: 'Eliza ' },
      { kind: 'mark', value: 'Wish' },
    ]);
  });
});
