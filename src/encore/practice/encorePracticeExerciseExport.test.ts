import { describe, expect, it } from 'vitest';
import type { EncoreLyricsInOwnWordsExerciseRun, EncoreSong } from '../types';
import {
  buildPracticeExerciseExportPlainText,
  practiceExerciseGoogleDocTitle,
  stripHtmlToPlainText,
} from './encorePracticeExerciseExport';

describe('stripHtmlToPlainText', () => {
  it('strips simple tags', () => {
    expect(stripHtmlToPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('returns empty for blank', () => {
    expect(stripHtmlToPlainText('   ')).toBe('');
  });
});

describe('buildPracticeExerciseExportPlainText', () => {
  it('includes lyrics line pairs', () => {
    const song: EncoreSong = {
      id: 's1',
      title: 'T',
      artist: 'A',
      journalMarkdown: '',
      lyricsSourceGenius: '[Verse]\nLine one',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
    };
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      id: 'r1',
      kind: 'lyricsInOwnWords',
      status: 'draft',
      startedAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
      sections: [{ title: 'Verse', lines: [{ original: 'Line one', rewrite: 'Mine' }] }],
    };
    const text = buildPracticeExerciseExportPlainText(song, run);
    expect(text).toContain('Song: T — A');
    expect(text).toContain('Original: Line one');
    expect(text).toContain('Rewrite: Mine');
  });
});

describe('practiceExerciseGoogleDocTitle', () => {
  it('uses a short bracket tag for lyrics-in-own-words', () => {
    const song: EncoreSong = {
      id: 's1',
      title: 'T',
      artist: 'A',
      journalMarkdown: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
    };
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      id: 'r1',
      kind: 'lyricsInOwnWords',
      status: 'draft',
      startedAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
      sections: [],
    };
    expect(practiceExerciseGoogleDocTitle(song, run)).toBe('[Lyrics rephrase] T - A');
  });
});
