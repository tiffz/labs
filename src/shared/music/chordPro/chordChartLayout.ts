/**
 * Structured chord chart layout (ChordPro ↔ sections/lines/markers).
 *
 * - **Placement:** `ChordMarker.charIndex` is a position in `LyricLine.text` (often a word token start).
 * - **Identity:** `ChordMarker.id` is stable for select/edit; multiple markers may share one `charIndex`.
 * - **Paint:** `tokenizeLyricLine`, `groupChordsByTokenStart`, `snapChordColumnToCharIndex` align UI and paste import.
 * - **Edits:** prefer `*ById` helpers; `upsertChordAtIndex` replaces all chords at an index.
 *
 * Fixtures: `./fixtures.ts` (`MEET_ME_MOON_PASTE`). Tests: `pastedChartImport.test.ts`, `chordChartLayout.test.ts`.
 */
import { parseChordProLine, parseChordProSectionHeader, parseChordProSections } from './chordProText';
import { matchWriteLinesToPrevious, reconcileChordsAfterTextChange } from './chordLyricReconcile';

export { reconcileChordsAfterTextChange, lineTextSimilarity, matchWriteLinesToPrevious } from './chordLyricReconcile';

export type SectionType = 'Verse' | 'Chorus' | 'Bridge' | 'Intro' | 'Outro' | 'Other';

export interface ChordMarker {
  /** Stable id for selection and per-chord edit; several markers may share `charIndex`. */
  id: string;
  chordName: string;
  charIndex: number;
}

export interface LyricLine {
  lineId: string;
  text: string;
  chords: ChordMarker[];
}

export interface SongSection {
  sectionId: string;
  type: SectionType;
  /** Display header, e.g. `Verse 1`. */
  header: string;
  lines: LyricLine[];
}

export interface ChartLayout {
  sections: SongSection[];
}

export interface LineToken {
  start: number;
  token: string;
}

export function newLineId(): string {
  return crypto.randomUUID();
}

export function inferSectionType(header: string): SectionType {
  const base = header.replace(/\s+\d+\s*$/, '').trim().toLowerCase();
  if (base === 'verse') return 'Verse';
  if (base === 'chorus') return 'Chorus';
  if (base === 'bridge') return 'Bridge';
  if (base === 'intro') return 'Intro';
  if (base === 'outro') return 'Outro';
  return 'Other';
}

export function slugSectionId(header: string): string {
  const slug = header
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || 'section';
}

/** Split a lyric line into word/whitespace tokens with character start indices. */
export function tokenizeLyricLine(text: string): LineToken[] {
  const tokens: LineToken[] = [];
  const re = /\S+|\s+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    tokens.push({ start: match.index, token: match[0] });
  }
  return tokens;
}

function lyricWordTokens(text: string): LineToken[] {
  return tokenizeLyricLine(text).filter((t) => /\S/.test(t.token));
}

/**
 * Map a monospace chord-line column to a lyric word-start index.
 * Columns past the lyric length snap to the last word (common for trailing chords).
 */
export function snapChordColumnToCharIndex(column: number, lyricText: string): number {
  if (!lyricText) return Math.max(0, column);
  const words = lyricWordTokens(lyricText);
  if (words.length === 0) return Math.min(Math.max(0, column), lyricText.length);

  const col = Math.max(0, column);
  if (col > lyricText.length) {
    return words[words.length - 1]!.start;
  }

  for (const word of words) {
    const end = word.start + word.token.length;
    if (col >= word.start && col < end) return word.start;
  }

  let best = words[0]!.start;
  for (const word of words) {
    if (word.start <= col) best = word.start;
    else break;
  }
  return best;
}

/** Assign char indices from chord-over-lyrics column positions. */
export function assignChordCharIndicesFromColumns(
  pairs: Array<{ chord: string; column: number }>,
  lyricText: string,
): Array<{ chord: string; charIndex: number }> {
  return pairs.map(({ chord, column }) => ({
    chord,
    charIndex: lyricText.length === 0 ? column : snapChordColumnToCharIndex(column, lyricText),
  }));
}

/** Group chord markers by lyric word-start for paint/export (supports duplicate indices). */
export function groupChordsByTokenStart(line: LyricLine): Map<number, ChordMarker[]> {
  const words = lyricWordTokens(line.text);
  const wordStarts = new Set(words.map((w) => w.start));
  const groups = new Map<number, ChordMarker[]>();

  for (const chord of line.chords) {
    let idx = chord.charIndex;
    if (line.text && !wordStarts.has(idx)) {
      idx = snapChordColumnToCharIndex(idx, line.text);
    }
    const list = groups.get(idx) ?? [];
    list.push(chord);
    groups.set(idx, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.charIndex - b.charIndex || a.chordName.localeCompare(b.chordName));
  }
  return groups;
}

function parseChordProLineToLyric(line: string, lineId: string): LyricLine {
  const segments = parseChordProLine(line);
  let text = '';
  const chords: ChordMarker[] = [];
  for (const seg of segments) {
    if (seg.kind === 'chord') {
      chords.push({
        id: crypto.randomUUID(),
        chordName: seg.value.trim(),
        charIndex: text.length,
      });
    } else {
      text += seg.value;
    }
  }
  chords.sort((a, b) => a.charIndex - b.charIndex);
  return { lineId, text, chords };
}

function emptyLine(): LyricLine {
  return { lineId: newLineId(), text: '', chords: [] };
}

/** Parse a ChordPro document into structured chart layout. */
export function parseChordProToChartLayout(document: string): ChartLayout {
  const parsed = parseChordProSections(document);
  if (parsed.length === 0) {
    return { sections: [] };
  }

  const sections: SongSection[] = parsed.map((sec, idx) => {
    const header = sec.header || `Section ${idx + 1}`;
    const lines = sec.lines.map((raw) => {
      const trimmed = raw.trimEnd();
      if (!trimmed) return emptyLine();
      return parseChordProLineToLyric(trimmed, newLineId());
    });
    if (lines.length === 0) lines.push(emptyLine());
    return {
      sectionId: `${slugSectionId(header)}-${idx}`,
      type: inferSectionType(header),
      header,
      lines,
    };
  });

  return { sections };
}

function serializeLineToChordPro(line: LyricLine): string {
  const { text, chords } = line;
  if (!text && chords.length === 0) return '';
  if (!text && chords.length > 0) {
    return [...chords]
      .sort((a, b) => a.charIndex - b.charIndex)
      .map((c) => `[${c.chordName}]`)
      .join('');
  }
  const sorted = [...chords].sort((a, b) => a.charIndex - b.charIndex);
  let out = '';
  let cursor = 0;
  for (const chord of sorted) {
    const idx = Math.max(0, Math.min(chord.charIndex, text.length));
    out += text.slice(cursor, idx);
    out += `[${chord.chordName}]`;
    cursor = idx;
  }
  out += text.slice(cursor);
  return out;
}

function trimTrailingEmptySectionLines(lines: string[], headerLineCount: number): string[] {
  const out = [...lines];
  while (out.length > headerLineCount && out[out.length - 1] === '') {
    out.pop();
  }
  return out;
}

/** Serialize structured layout back to ChordPro for Drive / IndexedDB storage. */
export function serializeChartLayoutToChordPro(layout: ChartLayout): string {
  const blocks: string[] = [];
  for (const section of layout.sections) {
    const sectionLines: string[] = [];
    if (section.header) {
      sectionLines.push(`[${section.header}]`);
    }
    for (const line of section.lines) {
      sectionLines.push(serializeLineToChordPro(line));
    }
    blocks.push(trimTrailingEmptySectionLines(sectionLines, section.header ? 1 : 0).join('\n'));
  }
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** Plain-text document for Write Mode (headers + lyrics, no chord tokens). */
export function layoutToWriteDocument(layout: ChartLayout): string {
  const blocks: string[] = [];
  for (const section of layout.sections) {
    const sectionLines: string[] = [];
    if (section.header) {
      sectionLines.push(`[${section.header}]`);
    }
    for (const line of section.lines) {
      sectionLines.push(line.text);
    }
    blocks.push(trimTrailingEmptySectionLines(sectionLines, section.header ? 1 : 0).join('\n'));
  }
  return blocks.join('\n\n').trimEnd();
}

function splitWriteDocumentSections(writeDoc: string): Array<{ header: string; bodyLines: string[] }> {
  const lines = writeDoc.split('\n');
  const out: Array<{ header: string; bodyLines: string[] }> = [];
  let current: { header: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const header = parseChordProSectionHeader(line);
    if (header) {
      current = { header, bodyLines: [] };
      out.push(current);
      continue;
    }
    if (!current) {
      current = { header: '', bodyLines: [] };
      out.push(current);
    }
    current.bodyLines.push(line);
  }
  return out;
}

/** Apply Write Mode edits while preserving chord markers via index reconciliation. */
export function parseWriteDocumentToLayout(writeDoc: string, previous: ChartLayout): ChartLayout {
  const parsedSections = splitWriteDocumentSections(writeDoc);

  const sections: SongSection[] = parsedSections.map((block, secIdx) => {
    const prevSection = previous.sections[secIdx];
    const header =
      parsedSections.length === 1
        ? block.header
        : block.header || prevSection?.header || `Section ${secIdx + 1}`;
    const lines: LyricLine[] = matchWriteLinesToPrevious(prevSection?.lines ?? [], block.bodyLines).map(
      ({ text, prevLine }) => {
        if (prevLine) {
          return {
            lineId: prevLine.lineId,
            text,
            chords: reconcileChordsAfterTextChange(prevLine.chords, prevLine.text, text),
          };
        }
        return { lineId: newLineId(), text, chords: [] };
      },
    );

    if (lines.length === 0) lines.push(emptyLine());

    return {
      sectionId: prevSection?.sectionId ?? `${slugSectionId(header)}-${secIdx}`,
      type: prevSection?.type ?? inferSectionType(header),
      header,
      lines,
    };
  });

  if (sections.length === 0) {
    return { sections: [{ sectionId: 'section-0', type: 'Other', header: '', lines: [emptyLine()] }] };
  }

  return { sections };
}

/** Replace every chord at `charIndex` with a single new marker (does not append a sibling). */
export function upsertChordAtIndex(line: LyricLine, charIndex: number, chordName: string): LyricLine {
  const idx = Math.max(0, Math.min(charIndex, line.text.length));
  const without = line.chords.filter((c) => c.charIndex !== idx);
  return {
    ...line,
    chords: [...without, { id: crypto.randomUUID(), chordName, charIndex: idx }].sort(
      (a, b) => a.charIndex - b.charIndex,
    ),
  };
}

export function removeChordById(line: LyricLine, chordId: string): LyricLine {
  return {
    ...line,
    chords: line.chords.filter((c) => c.id !== chordId),
  };
}

export function replaceChordById(line: LyricLine, chordId: string, chordName: string): LyricLine {
  return {
    ...line,
    chords: line.chords.map((c) => (c.id === chordId ? { ...c, chordName } : c)),
  };
}

export function moveChordById(line: LyricLine, chordId: string, toCharIndex: number): LyricLine {
  const chord = line.chords.find((c) => c.id === chordId);
  if (!chord) return line;
  const toIdx = Math.max(0, Math.min(toCharIndex, line.text.length));
  const without = line.chords.filter((c) => c.id !== chordId);
  return {
    ...line,
    chords: [...without, { ...chord, charIndex: toIdx }].sort(
      (a, b) => a.charIndex - b.charIndex || a.chordName.localeCompare(b.chordName),
    ),
  };
}

export function updateLineInLayout(
  layout: ChartLayout,
  sectionId: string,
  lineId: string,
  updater: (line: LyricLine) => LyricLine,
): ChartLayout {
  return {
    sections: layout.sections.map((sec) =>
      sec.sectionId !== sectionId
        ? sec
        : {
            ...sec,
            lines: sec.lines.map((line) => (line.lineId !== lineId ? line : updater(line))),
          },
    ),
  };
}
