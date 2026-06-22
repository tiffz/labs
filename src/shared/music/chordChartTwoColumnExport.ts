import type { ChartLayout, LyricLine } from './chordPro/chordChartLayout';
import { alignChordsOverLyricLine, chartLayoutToAsciiExport } from './chordChartAsciiExport';
import { CHORD_SYMBOL_TOKEN_RE_I } from './chordSymbolTokenPattern';

const CHORD_LINE_TOKEN_RE = CHORD_SYMBOL_TOKEN_RE_I;

/** True when every whitespace-separated token on the line is a chord symbol. */
export function isAsciiChartChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\[[^\]]+\]$/.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => CHORD_LINE_TOKEN_RE.test(token));
}

function chordTokensForLine(line: LyricLine): string[] {
  return [...line.chords]
    .sort((a, b) => a.charIndex - b.charIndex)
    .map((c) => c.chordName);
}

function formatSectionBlock(header: string, lines: LyricLine[]): string[] {
  const out: string[] = [header];
  for (const line of lines) {
    const text = line.text.trimEnd();
    if (!text && line.chords.length === 0) {
      out.push('');
      continue;
    }
    const chords = alignChordsOverLyricLine(text, chordTokensForLine(line));
    if (chords) out.push(chords);
    if (text) out.push(text);
  }
  return out;
}

function sectionAsciiBlocks(layout: ChartLayout): string[] {
  return layout.sections
    .map((section) => {
      const lines = formatSectionBlock(`[${section.header}]`, section.lines);
      return lines.join('\n').trimEnd();
    })
    .filter(Boolean);
}

export type TwoColumnChartExport = {
  left: string;
  right: string;
  /** Single-column fallback (clipboard). */
  single: string;
};

/** Split chart sections across two columns for print / Google Docs export. */
export function chartLayoutToTwoColumnExport(layout: ChartLayout): TwoColumnChartExport {
  const blocks = sectionAsciiBlocks(layout);
  const single = chartLayoutToAsciiExport(layout);
  if (blocks.length <= 1) {
    return { left: single, right: '', single };
  }
  const mid = Math.ceil(blocks.length / 2);
  return {
    left: blocks.slice(0, mid).join('\n\n'),
    right: blocks.slice(mid).join('\n\n'),
    single,
  };
}

/** UTF-16 half-open ranges for section header lines like `[Verse 1]`. */
export function boldSectionHeaderSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('[') && line.includes(']')) {
      spans.push({ start: offset, end: offset + line.length });
    }
    offset += line.length + 1;
  }
  return spans;
}

/** UTF-16 half-open ranges for section headers and chord-only lines (Google Docs bold). */
export function boldAsciiChartExportSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const boldLine =
      (trimmed.startsWith('[') && trimmed.includes(']')) || isAsciiChartChordLine(line);
    if (boldLine) {
      spans.push({ start: offset, end: offset + line.length });
    }
    offset += line.length + 1;
  }
  return spans;
}
