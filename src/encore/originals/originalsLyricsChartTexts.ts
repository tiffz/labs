import { parseChordProToChartLayout, layoutLyricsText } from '../../shared/music/chordPro/chordChartLayout';
import { chartLayoutToAsciiExport } from '../../shared/music/chordChartAsciiExport';

export function originalsLyricsChartTexts(lyricsAndChords: string): {
  lyrics: string;
  chordChart: string;
} {
  const chartLayout = parseChordProToChartLayout(lyricsAndChords);
  return {
    lyrics: layoutLyricsText(chartLayout),
    chordChart: chartLayoutToAsciiExport(chartLayout).trim(),
  };
}
