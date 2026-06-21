import { parseChordProToChartLayout, layoutToWriteDocument } from '../../shared/music/chordPro/chordChartLayout';
import { chartLayoutToAsciiExport } from '../../shared/music/chordChartAsciiExport';

export type OriginalChartClipboardTexts = {
  lyrics: string;
  chordChart: string;
  previewKind: 'lyrics' | 'chordChart' | null;
  previewText: string;
};

export function originalChartClipboardTexts(lyricsAndChords: string): OriginalChartClipboardTexts {
  const layout = parseChordProToChartLayout(lyricsAndChords);
  const lyrics = layoutToWriteDocument(layout).trim();
  const chordChart = chartLayoutToAsciiExport(layout).trim();
  const previewKind = chordChart ? 'chordChart' : lyrics ? 'lyrics' : null;
  const previewText = previewKind === 'chordChart' ? chordChart : previewKind === 'lyrics' ? lyrics : '';
  return { lyrics, chordChart, previewKind, previewText };
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
}
