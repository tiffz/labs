import { describe, expect, it } from 'vitest';
import { asciiChartTextToPrintHtml, buildChartPrintExportOptions, isAsciiChartChordLine } from './chordChartPrintExport';

describe('chordChartPrintExport', () => {
  it('detects chord-only ASCII lines', () => {
    expect(isAsciiChartChordLine('Fm                    Bb')).toBe(true);
    expect(isAsciiChartChordLine('Ab     Bb')).toBe(true);
    expect(isAsciiChartChordLine('Bb/Ab')).toBe(true);
    expect(isAsciiChartChordLine('[Verse 1]')).toBe(false);
    expect(isAsciiChartChordLine("I'm not like you")).toBe(false);
    expect(isAsciiChartChordLine('Instrumental chords: Ab  Bb')).toBe(false);
  });

  it('builds print export options from a song title', () => {
    expect(buildChartPrintExportOptions('A Thousand Castles')).toEqual({
      displayTitle: 'A Thousand Castles',
      suggestedFileName: 'A Thousand Castles - Chord Chart',
    });
  });

  it('bolds chord lines in print HTML', () => {
    const html = asciiChartTextToPrintHtml('[Verse 1]\nFm      Bb\nHello world');
    expect(html).toContain('class="chart-line section-header"');
    expect(html).toContain('class="chart-line chord-line"');
    expect(html).toContain('class="chart-line">Hello&nbsp;world</div>');
  });
});
