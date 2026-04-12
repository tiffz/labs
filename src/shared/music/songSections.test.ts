import { describe, expect, it } from 'vitest';
import {
  createDefaultSection,
  findPreviousChorus,
  type SongSection,
} from './songSections';

const DEFAULT_SECTION_RHYTHM_SETTINGS = {
  templateNotation: '',
};

describe('songSections helpers', () => {
  it('creates chorus linked to previous chorus by default', () => {
    const previousChorus = {
      ...createDefaultSection('chorus', DEFAULT_SECTION_RHYTHM_SETTINGS),
      lyrics: 'Shine on me',
      templateNotation: 'D---T---D-D-T---',
    };
    const nextChorus = createDefaultSection(
      'chorus',
      DEFAULT_SECTION_RHYTHM_SETTINGS,
      previousChorus
    );

    expect(nextChorus.linkedToPreviousChorusLyrics).toBe(true);
    expect(nextChorus.linkedToPreviousChorusTemplate).toBe(true);
    expect(nextChorus.lyrics).toBe('Shine on me');
    expect(nextChorus.templateNotation).toBe('D---T---D-D-T---');
  });

  it('finds nearest previous chorus', () => {
    const sections: SongSection[] = [
      createDefaultSection('verse', DEFAULT_SECTION_RHYTHM_SETTINGS),
      createDefaultSection('chorus', DEFAULT_SECTION_RHYTHM_SETTINGS),
      createDefaultSection('bridge', DEFAULT_SECTION_RHYTHM_SETTINGS),
      createDefaultSection('chorus', DEFAULT_SECTION_RHYTHM_SETTINGS),
    ];
    const previous = findPreviousChorus(sections, 3);
    expect(previous?.type).toBe('chorus');
    expect(previous?.id).toBe(sections[1]?.id);
  });
});
