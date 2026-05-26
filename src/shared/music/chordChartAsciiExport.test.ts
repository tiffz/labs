import { describe, expect, it } from 'vitest';
import { alignChordsOverLyricLine, chartLayoutToAsciiExport } from './chordChartAsciiExport';
import type { ChartLayout } from './chordPro/chordChartLayout';

describe('chordChartAsciiExport', () => {
  it('aligns chords over lyric words', () => {
    const aligned = alignChordsOverLyricLine("I'm not like you", ['Fm', 'Bb']);
    expect(aligned).toContain('Fm');
    expect(aligned).toContain('Bb');
  });

  it('formats sections with chord and lyric lines', () => {
    const layout: ChartLayout = {
      sections: [
        {
          sectionId: 'v1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'l1',
              text: "Hello world",
              chords: [{ id: 'c1', chordName: 'C', charIndex: 0 }],
            },
          ],
        },
      ],
    };
    const ascii = chartLayoutToAsciiExport(layout);
    expect(ascii).toContain('[Verse 1]');
    expect(ascii).toContain('Hello world');
    expect(ascii).toContain('C');
  });
});
