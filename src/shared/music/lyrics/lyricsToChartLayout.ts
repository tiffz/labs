import {
  inferSectionType,
  newLineId,
  parseChordProToChartLayout,
  slugSectionId,
  type ChartLayout,
  type LyricLine,
  type SongSection,
} from '../chordPro/chordChartLayout';
import { looksLikeFullSongLyrics, parseLyricSections, type ParsedLyricSectionDraft } from '../lyricSectionParser';

function sectionHeaderFromDraft(draft: ParsedLyricSectionDraft, verseIndex: number): string {
  if (draft.title && !draft.title.startsWith('Section ')) {
    return draft.title.replace(/[:-]+$/, '').trim();
  }
  if (draft.type === 'chorus') return 'Chorus';
  if (draft.type === 'bridge') return 'Bridge';
  if (draft.type === 'verse') return `Verse ${verseIndex}`;
  return draft.title || `Section ${verseIndex}`;
}

function lyricLinesFromText(text: string): LyricLine[] {
  const lines = text.split('\n').map((line) => ({
    lineId: newLineId(),
    text: line,
    chords: [] as LyricLine['chords'],
  }));
  return lines.length > 0 ? lines : [{ lineId: newLineId(), text: '', chords: [] }];
}

/** Turn Words-style section drafts into Encore chart layout (no chords). */
export function parsedLyricSectionsToChartLayout(drafts: ParsedLyricSectionDraft[]): ChartLayout {
  let verseCount = 0;
  const sections: SongSection[] = drafts.map((draft, idx) => {
    if (draft.type === 'verse') verseCount += 1;
    const header = sectionHeaderFromDraft(
      draft,
      draft.type === 'verse' ? verseCount : verseCount || idx + 1,
    );
    return {
      sectionId: `${slugSectionId(header)}-${idx}`,
      type: inferSectionType(header),
      header,
      lines: lyricLinesFromText(draft.lyrics),
    };
  });
  return { sections };
}

/** Infer multi-section chart layout from plain lyrics (paragraph breaks, chorus repeats). */
export function chartLayoutFromPlainLyrics(document: string): ChartLayout {
  return parsedLyricSectionsToChartLayout(parseLyricSections(document));
}

/** ChordPro when present; otherwise infer sections from plain lyric paragraphs. */
export function chartDocumentToChartLayout(document: string): ChartLayout {
  const trimmed = document.trim();
  if (!trimmed) {
    return { sections: [] };
  }

  const fromChordPro = parseChordProToChartLayout(trimmed);
  const hasExplicitSections =
    fromChordPro.sections.length > 1 ||
    fromChordPro.sections.some((section) => section.header.trim().length > 0);

  if (hasExplicitSections) return fromChordPro;
  if (looksLikeFullSongLyrics(trimmed)) {
    const inferred = chartLayoutFromPlainLyrics(trimmed);
    if (inferred.sections.length > 1) return inferred;
  }

  return fromChordPro;
}
