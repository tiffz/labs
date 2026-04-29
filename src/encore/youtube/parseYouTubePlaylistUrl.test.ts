import { describe, expect, it } from 'vitest';
import { parseYouTubePlaylistId } from './parseYouTubePlaylistUrl';

describe('parseYouTubePlaylistId', () => {
  it('parses playlist URL', () => {
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBe(
      'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    );
  });

  it('parses watch URL with list', () => {
    expect(parseYouTubePlaylistId('https://www.youtube.com/watch?v=abc&list=PLtest1234567')).toBe('PLtest1234567');
  });

  it('accepts raw id', () => {
    expect(parseYouTubePlaylistId('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBe('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  });
});
