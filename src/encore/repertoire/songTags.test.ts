import { describe, expect, it } from 'vitest';
import { collectAllSongTags, normalizeSongTags } from './songTags';
import type { EncoreSong } from '../types';

function songWithTags(id: string, tags: string[] | undefined): EncoreSong {
  return {
    id,
    title: 't',
    artist: 'a',
    journalMarkdown: '',
    createdAt: '',
    updatedAt: '',
    tags,
  };
}

describe('normalizeSongTags', () => {
  it('returns [] for nullish or empty', () => {
    expect(normalizeSongTags(undefined)).toEqual([]);
    expect(normalizeSongTags([])).toEqual([]);
  });

  it('trims whitespace and drops empties', () => {
    expect(normalizeSongTags(['  Pop ', '', '  '])).toEqual(['Pop']);
  });

  it('dedupes case-insensitively, keeping first-seen casing', () => {
    expect(normalizeSongTags(['Pop', 'pop', 'POP', 'Duet'])).toEqual(['Pop', 'Duet']);
  });

  it('caps tag length to 32 chars', () => {
    const long = 'a'.repeat(40);
    expect(normalizeSongTags([long])).toEqual(['a'.repeat(32)]);
  });

  it('ignores non-string entries defensively', () => {
    expect(normalizeSongTags(['Pop', 42 as unknown as string, null as unknown as string])).toEqual(['Pop']);
  });
});

describe('collectAllSongTags', () => {
  it('returns sorted unique tags across the library, preserving first-seen casing', () => {
    const songs = [
      songWithTags('1', ['Pop', 'Wedding']),
      songWithTags('2', ['pop', 'Duet']),
      songWithTags('3', undefined),
      songWithTags('4', ['  Jazz  ', '']),
    ];
    expect(collectAllSongTags(songs)).toEqual(['Duet', 'Jazz', 'Pop', 'Wedding']);
  });

  it('handles all-empty libraries', () => {
    expect(collectAllSongTags([])).toEqual([]);
  });
});
