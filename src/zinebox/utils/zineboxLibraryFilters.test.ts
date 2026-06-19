import { describe, expect, it } from 'vitest';

import type { ZineboxCollection, ZineboxComic } from '../types';
import { collectionMatchesLibraryFilters } from './zineboxLibraryFilters';

function comic(
  id: string,
  readStatus: ZineboxComic['readStatus'],
  title = 'Issue',
): ZineboxComic {
  return {
    id,
    title,
    source: 'Itch.io',
    fileId: id,
    coverThumbnailBase64: '',
    readStatus,
    progressPercentage: readStatus === 'finished' ? 100 : 0,
  };
}

describe('collectionMatchesLibraryFilters', () => {
  const comicsById = new Map<string, ZineboxComic>([
    ['a', comic('a', 'unread', 'A Girl, a cat')],
    ['b', comic('b', 'unread', 'puca')],
  ]);
  const collection: ZineboxCollection = {
    id: 'stack-1',
    name: 'Stack · A Girl, a cat',
    itemIds: ['a', 'b'],
  };

  it('hides all-unread stacks from Read filter', () => {
    expect(
      collectionMatchesLibraryFilters(collection, comicsById, {
        filter: 'read',
        source: null,
        tag: null,
        q: null,
      }),
    ).toBe(false);
  });

  it('shows stacks with any started issue under Read filter', () => {
    comicsById.set('a', comic('a', 'in_progress', 'A Girl, a cat'));
    comicsById.set('b', comic('b', 'finished', 'puca'));
    expect(
      collectionMatchesLibraryFilters(collection, comicsById, {
        filter: 'read',
        source: null,
        tag: null,
        q: null,
      }),
    ).toBe(true);
  });
});
