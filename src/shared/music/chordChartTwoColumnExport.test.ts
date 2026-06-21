import { describe, expect, it } from 'vitest';
import {
  boldAsciiChartExportSpans,
  chartLayoutToTwoColumnExport,
  isAsciiChartChordLine,
} from './chordChartTwoColumnExport';
import type { ChartLayout } from './chordPro/chordChartLayout';

describe('chordChartTwoColumnExport', () => {
  it('detects chord-only ASCII lines', () => {
    expect(isAsciiChartChordLine('Fm                    Bb')).toBe(true);
    expect(isAsciiChartChordLine('[Verse 1]')).toBe(false);
  });

  it('bolds section headers and chord lines for Google Docs export', () => {
    const text = '[Verse 1]\nFm      Bb\nHello world';
    const spans = boldAsciiChartExportSpans(text);
    expect(spans).toEqual([
      { start: 0, end: 9 },
      { start: 10, end: 20 },
    ]);
  });

  it('splits sections across left and right columns', () => {
    const layout: ChartLayout = {
      sections: [
        { sectionId: 'a', type: 'Verse', header: 'Verse 1', lines: [{ lineId: 'l1', text: 'A', chords: [] }] },
        { sectionId: 'b', type: 'Chorus', header: 'Chorus', lines: [{ lineId: 'l2', text: 'B', chords: [] }] },
        { sectionId: 'c', type: 'Bridge', header: 'Bridge', lines: [{ lineId: 'l3', text: 'C', chords: [] }] },
        { sectionId: 'd', type: 'Other', header: 'Outro', lines: [{ lineId: 'l4', text: 'D', chords: [] }] },
      ],
    };
    const { left, right } = chartLayoutToTwoColumnExport(layout);
    expect(left).toContain('[Verse 1]');
    expect(left).toContain('[Chorus]');
    expect(right).toContain('[Bridge]');
    expect(right).toContain('[Outro]');
  });
});
