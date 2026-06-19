import { describe, expect, it } from 'vitest';

import type { ZineboxComic } from '../types';
import { buildZineboxOrganizeSuggestions, normalizeZineboxSeriesKey } from './zineboxOrganizeSuggestions';

function comic(id: string, title: string, source = 'Shortbox'): ZineboxComic {
  return {
    id,
    title,
    source,
    fileId: id,
    coverThumbnailBase64: '',
    readStatus: 'unread',
    progressPercentage: 0,
  };
}

describe('normalizeZineboxSeriesKey', () => {
  it('strips issue numbers for grouping', () => {
    expect(normalizeZineboxSeriesKey('Teenage Fairy Godmother #2')).toBe('teenage fairy godmother');
  });
});

describe('buildZineboxOrganizeSuggestions', () => {
  it('suggests stacks for same series and source', () => {
    const suggestions = buildZineboxOrganizeSuggestions(
      [
        comic('a', 'Teenage Fairy Godmother #1'),
        comic('b', 'Teenage Fairy Godmother #2'),
        comic('c', 'Other Comic'),
      ],
      [],
    );
    expect(suggestions.stackCandidates).toHaveLength(1);
    expect(suggestions.stackCandidates[0]?.comicIds).toEqual(['a', 'b']);
  });

  it('flags identical title and source as duplicates', () => {
    const suggestions = buildZineboxOrganizeSuggestions(
      [
        comic('a', 'Opening Night', 'Shortbox'),
        comic('b', 'Opening Night', 'Shortbox'),
      ],
      [],
    );
    expect(suggestions.duplicates).toHaveLength(1);
    expect(suggestions.duplicates[0]?.reason).toBe('Same title and source');
  });
});
