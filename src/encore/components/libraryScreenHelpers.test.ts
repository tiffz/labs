import { describe, expect, it } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  mergeRepertoireColumnVisibility,
  repertoireColumnOrderForMrt,
  songMatchesSearch,
} from './libraryScreenHelpers';

function song(partial: Partial<EncoreSong> & Pick<EncoreSong, 'id' | 'title' | 'artist'>): EncoreSong {
  return {
    ...partial,
    id: partial.id,
    title: partial.title,
    artist: partial.artist,
    journalMarkdown: partial.journalMarkdown ?? '',
    createdAt: partial.createdAt ?? '2020-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2020-01-01T00:00:00.000Z',
  };
}

describe('mergeRepertoireColumnVisibility', () => {
  it('fills absent keys from defaults', () => {
    const out = mergeRepertoireColumnVisibility({});
    expect(out.lastIso).toBe(true);
    expect(out.refTracks).toBe(false);
  });
});

describe('songMatchesSearch', () => {
  const s = song({ id: '1', title: 'Hello', artist: 'World' });
  const perfBySong = new Map<string, EncorePerformance[]>([
    [
      '1',
      [
        {
          id: 'p1',
          songId: '1',
          date: '2024-03-01',
          venueTag: 'Martuni',
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: '2024-03-01T00:00:00.000Z',
        },
      ],
    ],
  ]);

  it('matches title substring', () => {
    expect(songMatchesSearch(s, 'hel', perfBySong)).toBe(true);
  });

  it('matches venue from performances', () => {
    expect(songMatchesSearch(s, 'martuni', perfBySong)).toBe(true);
  });

  it('returns true for blank query', () => {
    expect(songMatchesSearch(s, '   ', perfBySong)).toBe(true);
  });
});

describe('repertoireColumnOrderForMrt', () => {
  it('prepends select and ensures actions before spacer in table mode', () => {
    const order = repertoireColumnOrderForMrt('table', undefined, ['title', 'artist']);
    expect(order[0]).toBe('mrt-row-select');
    expect(order).toContain('mrt-row-actions');
    expect(order[order.length - 1]).toBe('mrt-row-spacer');
  });
});
