import { describe, expect, it } from 'vitest';
import { parseScoreFilename } from './parseScoreFilename';
import { SCORE_FILENAME_GOLDEN_FIXTURES } from './scoreFilenameFixtures';

describe('parseScoreFilename — golden fixtures', () => {
  for (const fx of SCORE_FILENAME_GOLDEN_FIXTURES) {
    it(`[${fx.id}] parses "${fx.raw}"`, () => {
      const got = parseScoreFilename(fx.raw);
      expect(got.title.toLowerCase()).toBe(fx.expectedTitle.toLowerCase());
      if (fx.expectedKey) {
        expect(got.key).toBe(fx.expectedKey);
      } else {
        expect(got.key).toBeUndefined();
      }
      if (fx.expectedArtist) {
        expect(got.artist).toBeDefined();
        /* Be tolerant of extra commas / whitespace in the parsed artist. */
        expect((got.artist ?? '').toLowerCase()).toContain(fx.expectedArtist.split(',')[0]!.trim().toLowerCase());
      }
      if (fx.expectedSourceShow) {
        expect(got.sourceShow ?? '').toMatch(new RegExp(escapeRegExp(fx.expectedSourceShow), 'i'));
      }
    });
  }
});

describe('parseScoreFilename — defensive cases', () => {
  it('returns Untitled for empty input', () => {
    expect(parseScoreFilename('')).toEqual({ title: 'Untitled', base: '', raw: '' });
  });

  it('handles inputs without extension', () => {
    const got = parseScoreFilename('Some Standard');
    expect(got.title).toBe('Some Standard');
  });

  it('handles uppercase extensions', () => {
    const got = parseScoreFilename('Memory - Bb Major - MN0066559.PDF');
    expect(got.title).toBe('Memory');
    expect(got.key).toBe('Bb major');
  });

  it('keeps title intact when descriptors collide with content', () => {
    const got = parseScoreFilename('A Whole New World - sheet music.pdf');
    expect(got.title).toBe('A Whole New World');
  });

  it('does not treat "Original Key" suffix as a key segment', () => {
    /* No formal "[A-G][b#]? Major|Minor" pattern → no key. */
    const got = parseScoreFilename('Reflection - Original Key - MN0057034.pdf');
    expect(got.key).toBeUndefined();
  });

  it('preserves trailing apostrophes and special characters in title', () => {
    const got = parseScoreFilename("Don't Stop Believin' - Eb Major - MN0099999.pdf");
    expect(got.title).toBe("Don't Stop Believin'");
    expect(got.key).toBe('Eb major');
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
