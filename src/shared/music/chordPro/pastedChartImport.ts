import {
  assignChordCharIndicesFromColumns,
  inferSectionType,
  newLineId,
  parseChordProToChartLayout,
  slugSectionId,
  type ChartLayout,
  type LyricLine,
  type SongSection,
} from './chordChartLayout';
import { isChordProSectionHeaderLine, parseChordProSectionHeader } from './chordProText';
import { importPlainLyricsFromClipboard } from '../lyrics/pastedLyricsImport';

/**
 * Chord symbol token — roots, qualities, slash bass, parenthetical extensions.
 * Intentionally permissive so pasted charts preserve symbols the playback engine may not parse.
 */
const CHORD_TOKEN_RE =
  /[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus2|sus4|add2|add9|m7|maj7|7|9|11|13|6|\+)?(?:\([^)]+\))?(?:\/[A-G](?:#|b)?)?/g;

const SECTION_HEADER_RE =
  /^\s*\[?\s*(verse|chorus|bridge|intro|outro|pre[\s-]?chorus|hook|tag|refrain|instrumental|solo|interlude|breakdown|drop)(?:\s+\d+)?\s*\]?\s*[:-]?\s*$/i;

const INLINE_CHORD_PRO_HEADER_RE = /^\s*\[(verse|chorus|bridge|intro|outro)/i;

function emptyLine(): LyricLine {
  return { lineId: newLineId(), text: '', chords: [] };
}

function normalizeSectionHeader(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/:$/, '')
    .trim();
  const match = stripped.match(
    /^(verse|chorus|bridge|intro|outro|pre[\s-]?chorus|hook|tag|refrain|instrumental|solo|interlude|breakdown|drop)(?:\s+(\d+))?\s*$/i,
  );
  if (!match) {
    return stripped
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  const typeKey = match[1]?.toLowerCase().replace(/\s+/g, '-') ?? '';
  const num = match[2];
  const label = sectionLabelFromTypeKey(typeKey);
  return num ? `${label} ${num}` : label;
}

function sectionLabelFromTypeKey(typeKey: string): string {
  switch (typeKey) {
    case 'verse':
      return 'Verse';
    case 'chorus':
    case 'refrain':
    case 'hook':
    case 'tag':
      return 'Chorus';
    case 'bridge':
    case 'breakdown':
    case 'drop':
      return 'Bridge';
    case 'intro':
    case 'interlude':
      return 'Intro';
    case 'outro':
    case 'solo':
      return 'Outro';
    case 'pre-chorus':
      return 'Pre-Chorus';
    case 'instrumental':
      return 'Instrumental';
    default:
      return typeKey.charAt(0).toUpperCase() + typeKey.slice(1);
  }
}

function parsePlainSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (isChordProSectionHeaderLine(trimmed)) {
    return normalizeSectionHeader(parseChordProSectionHeader(trimmed) ?? trimmed);
  }
  if (SECTION_HEADER_RE.test(trimmed)) {
    return normalizeSectionHeader(trimmed);
  }
  return null;
}

function chordTokenMatches(token: string): boolean {
  if (!token || token.length > 24) return false;
  if (!/^[A-G]/.test(token)) return false;
  return /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus2|sus4|add2|add9|m7|maj7|7|9|11|13|6|\+)?(?:\([^)]+\))?(?:\/[A-G](?:#|b)?)?$/.test(
    token,
  );
}

function extractChordTokens(line: string): Array<{ chord: string; column: number }> {
  const out: Array<{ chord: string; column: number }> = [];
  for (const match of line.matchAll(CHORD_TOKEN_RE)) {
    const token = match[0]?.trim();
    if (!token || !chordTokenMatches(token)) continue;
    out.push({ chord: token, column: match.index ?? 0 });
  }
  return out;
}

function lineWithoutChords(line: string): string {
  return line.replace(CHORD_TOKEN_RE, '').replace(/\s+/g, '');
}

/** True when the line is only chord symbols (and whitespace / punctuation). */
export function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (parsePlainSectionHeader(trimmed)) return false;
  const chords = extractChordTokens(trimmed);
  if (chords.length === 0) return false;
  const remainder = lineWithoutChords(trimmed);
  return remainder.length === 0 || /^[[\]()\-–—.,]*$/.test(remainder);
}

function looksLikeLyricLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (parsePlainSectionHeader(trimmed)) return false;
  if (isChordOnlyLine(trimmed)) return false;
  if (isChordProSectionHeaderLine(trimmed)) return false;
  if (/^\[[^\]]+\]\s*$/.test(trimmed)) return false;
  return /[a-z'’,]/.test(trimmed);
}

function overlayChordsOnLyric(chordLine: string, lyricLine: string): LyricLine {
  // Preserve leading spaces on the lyric line — they are part of the monospace column grid.
  const lyricAlign = lyricLine.trimEnd();
  const leadingTrim = lyricAlign.length - lyricAlign.trimStart().length;
  const text = lyricAlign.trim();
  const chords = assignChordCharIndicesFromColumns(extractChordTokens(chordLine), lyricAlign).map(
    ({ chord, charIndex }) => ({
      id: crypto.randomUUID(),
      chordName: chord,
      charIndex: Math.max(0, charIndex - leadingTrim),
    }),
  );
  chords.sort((a, b) => a.charIndex - b.charIndex || a.chordName.localeCompare(b.chordName));
  return { lineId: newLineId(), text, chords };
}

function nextNonBlankLineIndex(lines: string[], fromIndex: number): number {
  for (let j = fromIndex; j < lines.length; j += 1) {
    if ((lines[j] ?? '').trim()) return j;
  }
  return lines.length;
}

function parseInlineChordProLine(line: string): LyricLine {
  const trimmed = line.trimEnd();
  if (!trimmed) return emptyLine();
  let text = '';
  const chords: LyricLine['chords'] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  for (const match of trimmed.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) text += trimmed.slice(last, index);
    const inner = (match[1] ?? '').trim();
    if (chordTokenMatches(inner)) {
      chords.push({
        id: crypto.randomUUID(),
        chordName: inner,
        charIndex: text.length,
      });
    } else {
      text += match[0];
    }
    last = index + match[0].length;
  }
  text += trimmed.slice(last);
  return { lineId: newLineId(), text, chords };
}

function lineHasInlineChordProTokens(line: string): boolean {
  for (const match of line.matchAll(/\[([^\]]+)\]/g)) {
    if (chordTokenMatches((match[1] ?? '').trim())) return true;
  }
  return false;
}

function looksLikeInlineChordPro(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hasBracketHeader = lines.some(
    (l) => INLINE_CHORD_PRO_HEADER_RE.test(l) || parsePlainSectionHeader(l) !== null,
  );
  const hasInlineChords = lines.some((l) => lineHasInlineChordProTokens(l));
  return hasBracketHeader && hasInlineChords;
}

export function looksLikePastedChart(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (looksLikeInlineChordPro(trimmed)) return true;

  const lines = trimmed.split(/\r?\n/);
  const headerCount = lines.filter((l) => parsePlainSectionHeader(l.trim())).length;
  const chordOnlyCount = lines.filter((l) => isChordOnlyLine(l)).length;
  const lyricCount = lines.filter((l) => looksLikeLyricLine(l)).length;

  if (headerCount >= 2 && (chordOnlyCount >= 1 || lyricCount >= 2)) return true;
  if (headerCount >= 1 && chordOnlyCount >= 2) return true;
  if (chordOnlyCount >= 2 && lyricCount >= 2) return true;

  return false;
}

function parseChordOverLyricsChart(text: string): ChartLayout {
  const lines = text.split(/\r?\n/);
  const sections: SongSection[] = [];
  let current: SongSection | null = null;
  let sectionIdx = 0;

  const ensureSection = (header: string) => {
    current = {
      sectionId: `${slugSectionId(header || 'section')}-${sectionIdx}`,
      type: inferSectionType(header || 'Other'),
      header,
      lines: [],
    };
    sections.push(current);
    sectionIdx += 1;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) continue;

    const header = parsePlainSectionHeader(trimmed);
    if (header) {
      const nextTrimmed = (lines[i + 1] ?? '').trim();
      const prevSection = sections.length > 0 ? sections[sections.length - 1]! : null;
      const prevLine = prevSection?.lines.at(-1);
      let carryInstrumentalLine: LyricLine | null = null;
      if (
        header === 'Instrumental' &&
        prevLine &&
        prevLine.text === '' &&
        prevLine.chords.length > 0 &&
        prevSection
      ) {
        carryInstrumentalLine = prevLine;
        prevSection.lines.pop();
      }
      ensureSection(header);
      if (carryInstrumentalLine) {
        current!.lines.push(carryInstrumentalLine);
      } else if (header === 'Instrumental' && isChordOnlyLine(nextTrimmed)) {
        current!.lines.push(overlayChordsOnLyric(nextTrimmed, ''));
        i += 1;
      }
      continue;
    }

    if (!current) ensureSection('');

    if (isChordOnlyLine(trimmed)) {
      const nextIdx = nextNonBlankLineIndex(lines, i + 1);
      const nextLine = lines[nextIdx] ?? '';
      const nextTrimmed = nextLine.trim();
      const nextHeader = parsePlainSectionHeader(nextTrimmed);
      if (nextHeader === 'Instrumental') {
        ensureSection('Instrumental');
        current!.lines.push(overlayChordsOnLyric(trimmed, ''));
        i = nextIdx;
        continue;
      }
      if (looksLikeLyricLine(nextTrimmed)) {
        current!.lines.push(overlayChordsOnLyric(trimmed, nextLine));
        i = nextIdx;
        continue;
      }
      current!.lines.push(overlayChordsOnLyric(trimmed, ''));
      continue;
    }

    if (/\[[^\]]+\]/.test(trimmed) && extractChordTokens(lineWithoutChords(trimmed)).length === 0) {
      current!.lines.push(parseInlineChordProLine(trimmed));
      continue;
    }

    if (looksLikeLyricLine(trimmed)) {
      current!.lines.push({ lineId: newLineId(), text: line.trimEnd(), chords: [] });
    }
  }

  if (sections.length === 0) {
    return { sections: [{ sectionId: 'section-0', type: 'Other', header: '', lines: [emptyLine()] }] };
  }

  for (const sec of sections) {
    if (sec.lines.length === 0) sec.lines.push(emptyLine());
  }

  return { sections };
}

const MIXED_PASTE_LINE_THRESHOLD = 80;

/**
 * Long brainstorm + chart pastes: keep the trailing chord-chart block instead of treating
 * prose above as lyric lines in an anonymous section.
 */
export function extractChartPortionForImport(text: string): { text: string; excerpted: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { text: trimmed, excerpted: false };

  const lines = trimmed.split(/\r?\n/);
  if (lines.length <= MIXED_PASTE_LINE_THRESHOLD) {
    return { text: trimmed, excerpted: false };
  }

  const searchFrom = Math.max(0, lines.length - 150);
  for (let i = searchFrom; i < lines.length; i += 1) {
    const header = parsePlainSectionHeader(lines[i]?.trim() ?? '');
    if (!header) continue;
    let start = i;
    if (i > 0) {
      const prev = lines[i - 1]?.trim() ?? '';
      if (
        prev &&
        !parsePlainSectionHeader(prev) &&
        !isChordOnlyLine(prev) &&
        prev.length < 96 &&
        !looksLikeLyricLine(prev)
      ) {
        start = i - 1;
      }
    }
    const slice = lines.slice(start).join('\n').trim();
    if (!looksLikePastedChart(slice)) continue;
    if (slice === trimmed) return { text: trimmed, excerpted: false };
    return { text: slice, excerpted: true };
  }

  return { text: trimmed, excerpted: false };
}

export type PastedChartImportSummary = {
  ok: boolean;
  excerpted: boolean;
  sectionCount: number;
  lineCount: number;
  message: string;
  /** When false, the paste was treated as plain text — no toast. */
  notifyUser: boolean;
};

/** Detect, optionally excerpt, and parse clipboard chart text for Originals Write mode. */
export function importPastedChartFromClipboard(raw: string): PastedChartImportSummary & { layout?: ChartLayout } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      excerpted: false,
      sectionCount: 0,
      lineCount: 0,
      message: 'Nothing to import.',
      notifyUser: false,
    };
  }

  const { text: chartText, excerpted } = extractChartPortionForImport(trimmed);
  if (!looksLikePastedChart(chartText)) {
    const lyricsImport = importPlainLyricsFromClipboard(trimmed);
    if (lyricsImport.ok && lyricsImport.layout) {
      return {
        ok: true,
        excerpted: false,
        sectionCount: lyricsImport.sectionCount,
        lineCount: lyricsImport.lineCount,
        message: lyricsImport.message,
        notifyUser: lyricsImport.notifyUser,
        layout: lyricsImport.layout,
      };
    }
    return {
      ok: false,
      excerpted: false,
      sectionCount: 0,
      lineCount: 0,
      message: 'Paste kept as plain text (no chart or sectioned lyrics detected).',
      notifyUser: false,
    };
  }

  const layout = parsePastedChartToChartLayout(chartText);
  const sectionCount = layout.sections.length;
  const lineCount = layout.sections.reduce((n, s) => n + s.lines.length, 0);

  if (sectionCount === 0) {
    return {
      ok: false,
      excerpted,
      sectionCount: 0,
      lineCount: 0,
      message: 'Could not parse a chart from that paste.',
      notifyUser: true,
    };
  }

  const sectionWord = sectionCount === 1 ? 'section' : 'sections';
  const lineWord = lineCount === 1 ? 'line' : 'lines';
  let message = `Imported ${sectionCount} ${sectionWord} and ${lineCount} ${lineWord} with chords.`;
  if (excerpted) {
    message += ' Notes above the chart were left out; paste brainstorm in the Brainstorm tab.';
  }

  return {
    ok: true,
    excerpted,
    sectionCount,
    lineCount,
    message,
    notifyUser: true,
    layout,
  };
}

/** Parse pasted chart text (chord-over-lyrics, plain headers, or inline ChordPro) into app layout. */
export function parsePastedChartToChartLayout(text: string): ChartLayout {
  const trimmed = text.trim();
  if (!trimmed) {
    return { sections: [{ sectionId: 'section-0', type: 'Other', header: '', lines: [emptyLine()] }] };
  }

  if (looksLikeInlineChordPro(trimmed)) {
    return parseChordProToChartLayout(trimmed);
  }

  return parseChordOverLyricsChart(trimmed);
}
