import { describe, expect, it } from 'vitest';
import { appendOriginalChartSnapshot, mergeIdleChartSnapshot } from './originalsSnapshot';
import { createBlankOriginalSong } from './types';

describe('mergeIdleChartSnapshot', () => {
  it('keeps the latest chart text when appending history, not a stale song body', () => {
    const ghostChart = `[Dm]
[Chorus]
Old line`;
    const cleanedChart = `[Chorus]
Let it crash, let it pour.`;
    const song = {
      ...createBlankOriginalSong(),
      lyricsAndChords: ghostChart,
      history: [],
    };

    const merged = mergeIdleChartSnapshot(song, cleanedChart);
    expect(merged).not.toBeNull();
    expect(merged!.lyricsAndChords).toBe(cleanedChart);
    expect(merged!.history.at(-1)?.lyricsAndChords).toBe(cleanedChart);
  });

  it('returns null when history would not change', () => {
    const chart = '[Chorus]\nHook';
    const song = appendOriginalChartSnapshot(createBlankOriginalSong(), chart);
    expect(mergeIdleChartSnapshot(song, chart)).toBeNull();
  });
});
