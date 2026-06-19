import { describe, expect, it } from 'vitest';

import { comicMatchesSearchQuery } from './zineboxLibrarySearch';

describe('comicMatchesSearchQuery', () => {
  it('matches title tokens case-insensitively', () => {
    expect(
      comicMatchesSearchQuery(
        {
          id: '1',
          title: 'Alive Again',
          source: 'SBCF comics 2025',
          fileId: '1',
          coverThumbnailBase64: '',
          readStatus: 'unread',
          progressPercentage: 0,
          filename: 'matte-mueller.pdf',
        },
        'alive mueller',
      ),
    ).toBe(true);
  });
});
