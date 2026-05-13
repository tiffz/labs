import { describe, expect, it } from 'vitest';
import type { EncoreLyricsInOwnWordsExerciseRun, EncoreSong } from '../types';
import { buildPracticeExercisePdfBytes } from './encorePracticeExerciseExport';

describe('buildPracticeExercisePdfBytes (Unicode)', () => {
  it('embeds Cyrillic lyrics (uses Noto Sans, not WinAnsi Helvetica)', async () => {
    const song: EncoreSong = {
      id: 's1',
      title: 'T',
      artist: 'A',
      journalMarkdown: '',
    };
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      id: 'r1',
      kind: 'lyricsInOwnWords',
      status: 'draft',
      startedAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
      sections: [
        { title: 'Verse', lines: [{ original: 'привет', rewrite: 'hello' }] },
      ],
    };
    const bytes = await buildPracticeExercisePdfBytes(song, run);
    expect(bytes.length).toBeGreaterThan(2000);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe('%PDF');
  }, 30_000);
});
