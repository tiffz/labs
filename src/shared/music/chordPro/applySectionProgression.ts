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

/**
 * Lines the progression will land on. An empty section still counts one: applying writes the
 * progression as a new chord-only line, rather than reporting success while changing nothing.
 */
export function countSectionProgressionLines(section: SongSection): number {
  return Math.max(1, section.lines.filter(lineReceivesSectionProgression).length);
}

function firstWordCharIndex(lineText: string): number {
  const word = tokenizeLyricLine(lineText).find((token) => /\S/.test(token.token));
  return word?.start ?? 0;
}

/**
 * Put a progression into a section.
 *
 * - A lyric line gets one chord at its first word, looping the progression across the lines.
 * - A chord-only line (an intro, a solo) is a chord chart, so it gets the whole progression, one
 *   chord per measure. It used to get one chord, so `Am F C G` collapsed to `Am`.
 * - An empty section gets the progression as one new chord-only line. It used to change nothing
 *   and report success, so applying a progression to a fresh instrumental section did nothing.
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

  const chordOnlyLine = (line: LyricLine): LyricLine => ({
    ...line,
    chords: chordSymbols.map((chordName) => ({ id: crypto.randomUUID(), chordName, charIndex: 0 })),
  });

  let chordIndex = 0;
  const progressionLineCount = countSectionProgressionLines(section);
  const nextLayout: ChartLayout = {
    sections: layout.sections.map((entry) => {
      if (entry.sectionId !== sectionId) return entry;
      if (!entry.lines.some(lineReceivesSectionProgression)) {
        // Empty section: the first (blank) line becomes the chord line, or a new one is added.
        const [first, ...rest] = entry.lines;
        const base: LyricLine = first ?? { lineId: crypto.randomUUID(), text: '', chords: [] };
        return { ...entry, lines: [chordOnlyLine(base), ...rest] };
      }
      return {
        ...entry,
        lines: entry.lines.map((line) => {
          if (!lineReceivesSectionProgression(line)) return line;
          if (!line.text.trim()) return chordOnlyLine(line);
          const chordName = chordSymbols[chordIndex % chordSymbols.length]!;
          chordIndex += 1;
          const charIndex = snapChordColumnToCharIndex(firstWordCharIndex(line.text), line.text);
          return { ...line, chords: [{ id: crypto.randomUUID(), chordName, charIndex }] };
        }),
      };
    }),
  };

  return {
    layout: nextLayout,
    result: { ok: true, chordCount: chordSymbols.length, lineCount: progressionLineCount },
  };
}
