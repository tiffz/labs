import { describe, expect, it } from 'vitest';
import {
  buildLyricsInOwnWordsExportTable,
  buildLyricsInOwnWordsGoogleDocLayout,
  buildLyricsInOwnWordsGoogleDocPreambleLines,
} from './encorePracticeExerciseExport';
import type { EncoreLyricsInOwnWordsExerciseRun, EncoreSong } from '../types';

const baseSong: EncoreSong = {
  id: 's1',
  title: 'Test Song',
  artist: 'Test Artist',
  journalMarkdown: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lyricsSourceGenius: '[Verse 1]\nLine one\nLine two',
};

const baseRun: EncoreLyricsInOwnWordsExerciseRun = {
  id: 'r1',
  kind: 'lyricsInOwnWords',
  status: 'draft',
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  sections: [
    {
      title: 'Verse 1',
      lines: [
        { original: 'Line one', rewrite: 'First rewrite' },
        { original: 'Line two', rewrite: '' },
      ],
    },
  ],
};

describe('buildLyricsInOwnWordsExportTable', () => {
  it('starts with column labels then section header and aligned pairs', () => {
    const { preamble, tableRows } = buildLyricsInOwnWordsExportTable(baseSong, baseRun);
    expect(preamble).toContain('Test Song');
    expect(preamble).toContain('Lyrics in your own words');
    expect(tableRows[0]).toEqual({ kind: 'columnLabels' });
    expect(tableRows[1]).toEqual({ kind: 'sectionHeader', title: '[Verse 1]' });
    expect(tableRows[2]).toEqual({
      kind: 'lyricPair',
      original: 'Line one',
      rewrite: 'First rewrite',
    });
    expect(tableRows[3]).toEqual({
      kind: 'lyricPair',
      original: 'Line two',
      rewrite: '(empty)',
    });
    expect(tableRows).toHaveLength(4);
  });
});

describe('buildLyricsInOwnWordsGoogleDocPreambleLines', () => {
  it('returns two lines (song and exercise only)', () => {
    const [a, b] = buildLyricsInOwnWordsGoogleDocPreambleLines(baseSong);
    expect(a).toContain('Test Song');
    expect(b).toContain('Lyrics in your own words');
  });
});

describe('buildLyricsInOwnWordsGoogleDocLayout', () => {
  it('uses one newline-aligned block per column and bolds labels and section header in both columns', () => {
    const out = buildLyricsInOwnWordsGoogleDocLayout(baseSong, baseRun);
    expect(out.preamble.replace(/\n$/, '').split('\n')).toHaveLength(2);
    expect(out.leftCell.split('\n')[0]).toBe('Original');
    expect(out.rightCell.split('\n')[0]).toBe('Rewrite (your words)');
    expect(out.leftCell.split('\n')).toHaveLength(out.rightCell.split('\n').length);
    expect(out.leftBold.some((b) => out.leftCell.slice(b.start, b.end) === 'Original')).toBe(true);
    expect(out.rightBold.some((b) => out.rightCell.slice(b.start, b.end) === 'Rewrite (your words)')).toBe(
      true,
    );
    expect(out.leftBold.some((b) => out.leftCell.slice(b.start, b.end) === '[Verse 1]')).toBe(true);
    expect(out.rightBold.some((b) => out.rightCell.slice(b.start, b.end) === '[Verse 1]')).toBe(true);
  });

  it('inserts blank lines between sections', () => {
    const twoSectionRun: EncoreLyricsInOwnWordsExerciseRun = {
      ...baseRun,
      sections: [
        baseRun.sections[0]!,
        {
          title: 'Chorus',
          lines: [{ original: 'Chorus line', rewrite: 'Chorus rewrite' }],
        },
      ],
    };
    const out = buildLyricsInOwnWordsGoogleDocLayout(baseSong, twoSectionRun);
    const left = out.leftCell.split('\n');
    const v2 = left.indexOf('[Chorus]');
    expect(v2).toBeGreaterThanOrEqual(0);
    expect(left[v2 - 1]).toBe('');
    expect(left[v2 - 2]).toBe('');
  });
});
