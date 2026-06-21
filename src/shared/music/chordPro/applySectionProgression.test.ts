import { describe, expect, it } from 'vitest';
import { applyProgressionToChartSection } from './applySectionProgression';
import type { ChartLayout } from './chordChartLayout';

const layout: ChartLayout = {
  sections: [
    {
      sectionId: 'verse-1',
      type: 'Verse',
      header: 'Verse 1',
      lines: [
        { lineId: 'l1', text: 'First line here', chords: [] },
        { lineId: 'l2', text: 'Second line here', chords: [] },
        { lineId: 'l3', text: 'Third line here', chords: [] },
      ],
    },
  ],
};

describe('applyProgressionToChartSection', () => {
  it('loops one chord per line from a pasted progression', () => {
    const { layout: next, result } = applyProgressionToChartSection(
      layout,
      'verse-1',
      'C → Am → F → G',
      'C major',
    );
    expect(result).toEqual({ ok: true, chordCount: 4, lineCount: 3 });
    const chords = next.sections[0]!.lines.map((line) => line.chords[0]?.chordName);
    expect(chords).toEqual(['C', 'Am', 'F']);
  });

  it('ignores blank placeholder lines when counting and applying', () => {
    const withBlank: ChartLayout = {
      sections: [
        {
          sectionId: 'verse-1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            { lineId: 'l1', text: 'First line here', chords: [] },
            { lineId: 'l2', text: 'Second line here', chords: [] },
            { lineId: 'l3', text: 'Third line here', chords: [] },
            { lineId: 'l4', text: 'Fourth line here', chords: [] },
            { lineId: 'blank', text: '', chords: [] },
          ],
        },
      ],
    };
    const { layout: next, result } = applyProgressionToChartSection(
      withBlank,
      'verse-1',
      'C → Am → F → G',
      'C major',
    );
    expect(result).toEqual({ ok: true, chordCount: 4, lineCount: 4 });
    expect(next.sections[0]!.lines[4]!.chords).toEqual([]);
    expect(next.sections[0]!.lines.map((line) => line.chords[0]?.chordName ?? null)).toEqual([
      'C',
      'Am',
      'F',
      'G',
      null,
    ]);
  });

  it('rejects empty and invalid progressions', () => {
    expect(applyProgressionToChartSection(layout, 'verse-1', '', 'C').result).toEqual({
      ok: false,
      reason: 'empty',
    });
    expect(applyProgressionToChartSection(layout, 'verse-1', '???', 'C').result).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
