import { describe, expect, it } from 'vitest';
import {
  createDefaultSection,
  findPreviousChorus,
  type SongSection,
} from './songSections';
import { DEFAULT_WORD_RHYTHM_SETTINGS } from '../../drums/wordRhythm/prosodyEngine';

describe('songSections helpers', () => {
  it('creates chorus linked to previous chorus by default', () => {
    const previousChorus = {
      ...createDefaultSection('chorus', DEFAULT_WORD_RHYTHM_SETTINGS),
      lyrics: 'Shine on me',
      templateNotation: 'D---T---D-D-T---',
      templateBias: 80,
    };
    const nextChorus = createDefaultSection(
      'chorus',
      DEFAULT_WORD_RHYTHM_SETTINGS,
      previousChorus
    );

    expect(nextChorus.linkedToPreviousChorusLyrics).toBe(true);
    expect(nextChorus.linkedToPreviousChorusTemplate).toBe(true);
    expect(nextChorus.lyrics).toBe('Shine on me');
    expect(nextChorus.templateNotation).toBe('D---T---D-D-T---');
    expect(nextChorus.templateBias).toBe(80);
  });

  it('finds nearest previous chorus', () => {
    const sections: SongSection[] = [
      createDefaultSection('verse', DEFAULT_WORD_RHYTHM_SETTINGS),
      createDefaultSection('chorus', DEFAULT_WORD_RHYTHM_SETTINGS),
      createDefaultSection('bridge', DEFAULT_WORD_RHYTHM_SETTINGS),
      createDefaultSection('chorus', DEFAULT_WORD_RHYTHM_SETTINGS),
    ];
    const previous = findPreviousChorus(sections, 3);
    expect(previous?.type).toBe('chorus');
    expect(previous?.id).toBe(sections[1]?.id);
  });
});
