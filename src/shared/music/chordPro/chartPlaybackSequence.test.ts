import { describe, expect, it } from 'vitest';
import {
  CHART_PLAYBACK_MEASURES_PER_LINE,
  chartLayoutToPlaybackSequence,
  chartPlaybackMeasureDurationMs,
} from './chartPlaybackSequence';
import type { ChartLayout } from './chordChartLayout';

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
});
