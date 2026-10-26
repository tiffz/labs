import { describe, expect, it } from 'vitest';
import {
  CHART_PLAYBACK_MEASURES_PER_LINE,
  chartLayoutToPlaybackSequence,
  chartPlaybackMeasureDurationMs,
  estimateChartPlaybackDurationMs,
  estimateChartPlaybackMeasureCount,
  formatChartPlaybackDuration,
} from './chartPlaybackSequence';
import { parseChordProToChartLayout, type ChartLayout } from './chordChartLayout';

describe('chartPlaybackSequence', () => {
  it('orders chords by section, line, and char index with two measures per line', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'Hello world',
              chords: [
                { id: 'c2', chordName: 'G', charIndex: 6 },
                { id: 'c1', chordName: 'C', charIndex: 0 },
              ],
            },
          ],
        },
      ],
    };
    const steps = chartLayoutToPlaybackSequence(layout);
    expect(steps).toHaveLength(CHART_PLAYBACK_MEASURES_PER_LINE);
    expect(steps.map((s) => s.chordName)).toEqual(['C', 'G']);
    expect(steps[0]?.lyricHighlightStart).toBe(0);
    expect(steps[1]?.lyricHighlightStart).toBe(6);
  });

  it('repeats the only chord on a line for the second measure', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'Hello world',
              chords: [{ id: 'c1', chordName: 'C', charIndex: 0 }],
            },
          ],
        },
      ],
    };
    const steps = chartLayoutToPlaybackSequence(layout);
    expect(steps.map((s) => s.chordName)).toEqual(['C', 'C']);
    expect(steps[1]?.markerId).toBe('c1');
  });

  it('carries the previous chord onto a line with no chords', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'First line',
              chords: [{ id: 'c1', chordName: 'Am', charIndex: 0 }],
            },
            {
              lineId: 'l2',
              text: 'Second line',
              chords: [],
            },
          ],
        },
      ],
    };
    const steps = chartLayoutToPlaybackSequence(layout);
    expect(steps.map((s) => s.chordName)).toEqual(['Am', 'Am', 'Am', 'Am']);
  });

  it('computes measure duration from tempo', () => {
    expect(chartPlaybackMeasureDurationMs(120)).toBe(2000);
  });

  it('estimates playback duration from measure heuristics and tempo', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'Hello world',
              chords: [{ id: 'c1', chordName: 'C', charIndex: 0 }],
            },
            {
              lineId: 'l2',
              text: 'Second line',
              chords: [{ id: 'c2', chordName: 'G', charIndex: 0 }],
            },
          ],
        },
      ],
    };
    expect(estimateChartPlaybackMeasureCount(layout)).toBe(2);
    expect(estimateChartPlaybackDurationMs(layout, 120)).toBe(4000);
    expect(formatChartPlaybackDuration(4000)).toBe('0:04');
  });

  it('uses one measure for short lyric lines when estimating duration', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'Kept on driving',
              chords: [{ id: 'c1', chordName: 'F', charIndex: 0 }],
            },
            {
              lineId: 'l2',
              text: 'The house I left behind',
              chords: [
                { id: 'c2', chordName: 'Am', charIndex: 0 },
                { id: 'c3', chordName: 'C', charIndex: 18 },
              ],
            },
          ],
        },
      ],
    };
    expect(estimateChartPlaybackMeasureCount(layout)).toBe(3);
  });

  it('ignores lines with unparseable chords when estimating duration', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: 'Hello',
              chords: [{ id: 'c1', chordName: 'NotAChord', charIndex: 0 }],
            },
          ],
        },
      ],
    };
    expect(estimateChartPlaybackDurationMs(layout, 120)).toBe(0);
  });

  it('estimates a lyrics-only song (no chords) from its line breakdown + tempo', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            // Short line -> one measure.
            { lineId: 'l1', text: 'Hello world', chords: [] },
            // Long line (no chords) -> two measures via the length heuristic, not a
            // flat one measure. Without this, a lyrics-only song under-estimates.
            {
              lineId: 'l2',
              text: 'I have been waiting here for so long tonight',
              chords: [],
            },
          ],
        },
      ],
    };
    expect(estimateChartPlaybackMeasureCount(layout)).toBe(3);
    // 3 measures at 120 BPM = 6000ms (2000ms/measure) — a real, non-zero estimate.
    expect(estimateChartPlaybackDurationMs(layout, 120)).toBe(6000);
  });
});

describe('every chord plays (chord charts and instrumentals)', () => {
  const chordsPlayed = (chordPro: string) =>
    chartLayoutToPlaybackSequence(parseChordProToChartLayout(chordPro)).map((step) => step.chordName);

  it('plays all four chords of a chord-only line, one measure each', () => {
    // Used to play only the first two: `[Am][F][C][G]` sounded as `Am F`.
    expect(chordsPlayed('[Solo]\n[Am][F][C][G]')).toEqual(['Am', 'F', 'C', 'G']);
  });

  it('gives a lyric line with more than two chords a measure per chord', () => {
    expect(chordsPlayed('[Verse]\n[C]I [G]walk [Am]the [F]line today')).toEqual(['C', 'G', 'Am', 'F']);
  });

  it('keeps two measures for an ordinary lyric line', () => {
    expect(chordsPlayed('[Verse]\n[C]Hello [G]world')).toEqual(['C', 'G']);
    expect(chordsPlayed('[Verse]\n[C]Hello world')).toEqual(['C', 'C']);
  });

  it('estimates a chord-only chart at the measures it plays', () => {
    const layout = parseChordProToChartLayout('[Intro]\n[Am][F][C][G]\n[Am][F][C][G]');
    expect(estimateChartPlaybackMeasureCount(layout)).toBe(chartLayoutToPlaybackSequence(layout).length);
  });
});
