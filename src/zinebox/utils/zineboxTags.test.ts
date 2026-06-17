import { describe, expect, it } from 'vitest';

import { comicMatchesTagFilter, normalizeZineboxTags } from './zineboxTags';

describe('zineboxTags', () => {
  it('normalizes and dedupes tags', () => {
    expect(normalizeZineboxTags([' Shortbox ', 'shortbox', '2024'])).toEqual(['Shortbox', '2024']);
  });

  it('matches tag filter case-insensitively', () => {
    expect(comicMatchesTagFilter({ tags: ['Shortbox'] }, 'shortbox')).toBe(true);
    expect(comicMatchesTagFilter({ tags: ['2024'] }, 'anthology')).toBe(false);
  });
});
