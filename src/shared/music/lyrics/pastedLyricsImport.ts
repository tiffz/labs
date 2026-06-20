import { looksLikeFullSongLyrics, parseLyricSections } from '../lyricSectionParser';
import type { ChartLayout } from '../chordPro/chordChartLayout';
import { chartLayoutFromPlainLyrics } from './lyricsToChartLayout';

export type PastedLyricsImportSummary = {
  ok: boolean;
  sectionCount: number;
  lineCount: number;
  message: string;
  notifyUser: boolean;
  layout?: ChartLayout;
};

/** Plain lyrics with paragraph breaks (caller should skip chord-chart pastes first). */
export function looksLikePlainLyricsPaste(text: string): boolean {
  return looksLikeFullSongLyrics(text.trim());
}

/** Parse pasted plain lyrics into a structured chart (sections + inferred chorus/bridge). */
export function importPlainLyricsFromClipboard(raw: string): PastedLyricsImportSummary {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      sectionCount: 0,
      lineCount: 0,
      message: 'Nothing to import.',
      notifyUser: false,
    };
  }

  if (!looksLikePlainLyricsPaste(trimmed)) {
    return {
      ok: false,
      sectionCount: 0,
      lineCount: 0,
      message: 'Paste kept as plain text.',
      notifyUser: false,
    };
  }

  const layout = chartLayoutFromPlainLyrics(trimmed);
  const sectionCount = layout.sections.length;
  const lineCount = layout.sections.reduce((n, section) => n + section.lines.length, 0);

  if (sectionCount === 0) {
    return {
      ok: false,
      sectionCount: 0,
      lineCount: 0,
      message: 'Could not infer sections from that paste.',
      notifyUser: true,
    };
  }

  const chorusCount = parseLyricSections(trimmed).filter((draft) => draft.type === 'chorus').length;
  const sectionWord = sectionCount === 1 ? 'section' : 'sections';
  let message = `Imported ${sectionCount} ${sectionWord} from lyrics`;
  if (chorusCount > 0) {
    message += ` (${chorusCount} chorus${chorusCount === 1 ? '' : 'es'} detected)`;
  }
  message += '.';

  return {
    ok: true,
    sectionCount,
    lineCount,
    message,
    notifyUser: true,
    layout,
  };
}
