import { parseProgressionText } from '../chordProgressionText';
import { songKeyToTonic } from '../chordTheory';
import type { ChartLayout, LyricLine, SongSection } from './chordChartLayout';
import { snapChordColumnToCharIndex, tokenizeLyricLine } from './chordChartLayout';

export type ApplySectionProgressionResult =
  | { ok: true; chordCount: number; lineCount: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'unknown-section' };

/** Lines that receive one chord when applying a section progression (lyric or chord-only). */
export function lineReceivesSectionProgression(line: LyricLine): boolean {
  return line.text.trim().length > 0 || line.chords.length > 0;
}

export function countSectionProgressionLines(section: SongSection): number {
  return section.lines.filter(lineReceivesSectionProgression).length;
}

function firstWordCharIndex(lineText: string): number {
  const word = tokenizeLyricLine(lineText).find((token) => /\S/.test(token.token));
  return word?.start ?? 0;
}

/**
 * Map one chord per lyric line in a section, looping the progression as needed.
 * Each line gets a single chord at the first word (column 0 when the line is empty).
 */
export function applyProgressionToChartSection(
  layout: ChartLayout,
  sectionId: string,
  progressionInput: string,
  songKey: string
): { layout: ChartLayout; result: ApplySectionProgressionResult } {
  const section = layout.sections.find((entry) => entry.sectionId === sectionId);
  if (!section) {
    return { layout, result: { ok: false, reason: 'unknown-section' } };
  }

  const trimmed = progressionInput.trim();
  if (!trimmed) {
    return { layout, result: { ok: false, reason: 'empty' } };
  }

  const parsed = parseProgressionText(trimmed, songKeyToTonic(songKey));
  const chordSymbols = parsed.isValid ? parsed.resolvedChordSymbols : [];
  if (chordSymbols.length === 0) {
    return { layout, result: { ok: false, reason: 'invalid' } };
  }

  let chordIndex = 0;
  const progressionLineCount = countSectionProgressionLines(section);
  const nextLayout: ChartLayout = {
    sections: layout.sections.map((entry) => {
      if (entry.sectionId !== sectionId) return entry;
      return {
        ...entry,
        lines: entry.lines.map((line) => {
          if (!lineReceivesSectionProgression(line)) return line;
          const chordName = chordSymbols[chordIndex % chordSymbols.length]!;
          chordIndex += 1;
          const charIndex = line.text.trim()
            ? snapChordColumnToCharIndex(firstWordCharIndex(line.text), line.text)
            : 0;
          return {
            ...line,
            chords: [
              {
                id: crypto.randomUUID(),
                chordName,
                charIndex,
              },
            ],
          };
        }),
      };
    }),
  };

  return {
    layout: nextLayout,
    result: { ok: true, chordCount: chordSymbols.length, lineCount: progressionLineCount },
  };
}
