import { describe, expect, it } from 'vitest';
import type { SongSection } from '../../shared/music/songSections';
import {
  buildWordsAudioExportFileName,
  buildWordsChartExportOptions,
  wordsExportTitleFromSections,
} from './wordsExportFileName';

describe('wordsExportFileName', () => {
  const sections: SongSection[] = [
    {
      id: 'v1',
      type: 'verse',
      lyrics: 'I fought the tide to shape the land.\nSecond line.',
      chordProgressionInput: '',
      chordStyleId: 'simple',
      isLocked: false,
      templateNotation: '',
      rhythmVariationSeed: 0,
      soundVariationSeed: 0,
      linkedToPreviousChorusLyrics: false,
      linkedToPreviousChorusTemplate: false,
    },
  ];

  it('uses the first lyric line as the export title', () => {
    expect(wordsExportTitleFromSections(sections)).toBe('I fought the tide to shape the land.');
  });

  it('builds readable audio and chart export names', () => {
    expect(buildWordsAudioExportFileName(sections, 'D minor')).toBe(
      'I fought the tide to shape the land. - Words Song',
    );
    expect(buildWordsChartExportOptions(sections)).toEqual({
      displayTitle: 'I fought the tide to shape the land.',
      suggestedFileName: 'I fought the tide to shape the land. - Chord Chart',
    });
  });
});
