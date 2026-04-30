import { describe, expect, it } from 'vitest';
import { collectGenresForArtistIds, normalizeSpotifyGenreList } from './spotifyApi';

describe('normalizeSpotifyGenreList', () => {
  it('dedupes and sorts', () => {
    expect(normalizeSpotifyGenreList(['pop', '  rock ', 'pop', 'jazz'])).toEqual(['jazz', 'pop', 'rock']);
  });
});

describe('collectGenresForArtistIds', () => {
  it('unions genres from multiple artist ids', () => {
    const map = new Map<string, string[]>([
      ['a1', ['show tunes', 'pop']],
      ['a2', ['pop']],
    ]);
    expect(collectGenresForArtistIds(['a1', 'a2'], map)).toEqual(['pop', 'show tunes']);
  });
});
