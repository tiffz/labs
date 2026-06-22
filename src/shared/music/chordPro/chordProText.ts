/** Matches inline ChordPro chord tokens like `[Fm]`, `[Bbmaj7]`, `[C/E]`. */
const CHORD_TOKEN_RE = /\[([^\]]+)\]/g;

const SECTION_HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;

/** Bracket labels that are song structure, not chord symbols. */
const STRUCTURAL_SECTION_LABEL_RE =
  /^(verse|chorus|bridge|intro|outro|pre[\s-]?chorus|hook|tag|refrain|instrumental|solo|interlude|breakdown|drop)(?:\s+\d+)?$/i;

/** Optional trailing key hint on pasted section headers, e.g. `[Verse 1] - Starts on G3`. */
export const SECTION_HEADER_STARTS_ON_ANNOTATION_RE =
  /\s*[-–—]\s*Starts on\s+[A-G](?:#|b)?\d?\s*$/i;

export function stripSectionHeaderAnnotation(line: string): string {
  return line.trim().replace(SECTION_HEADER_STARTS_ON_ANNOTATION_RE, '').trim();
}

import { CHORD_SYMBOL_TOKEN_RE } from '../chordSymbolTokenPattern';

/** Inline chord symbol when the whole line is a single bracket token, e.g. `[Dm]`. */
const CHORD_SYMBOL_ONLY_RE = CHORD_SYMBOL_TOKEN_RE;

function bracketContentLooksLikeChordSymbol(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return false;
  if (STRUCTURAL_SECTION_LABEL_RE.test(trimmed)) return false;
  return CHORD_SYMBOL_ONLY_RE.test(trimmed);
}

export interface ChordProSegment {
  kind: 'chord' | 'text';
  value: string;
}

/** Split a single line into alternating chord and lyric segments. */
export function parseChordProLine(line: string): ChordProSegment[] {
  const segments: ChordProSegment[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(CHORD_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: line.slice(lastIndex, index) });
    }
    segments.push({ kind: 'chord', value: match[1] ?? '' });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ kind: 'text', value: line.slice(lastIndex) });
  }
  return segments;
}

/** Remove all `[...]` chord tokens for lyrics-only view. */
export function stripChordBrackets(text: string): string {
  return text.replace(CHORD_TOKEN_RE, '');
}

/** Plain lyric snippet for library cards (no chords, collapsed whitespace). */
export function chordProLyricSnippet(text: string, maxLen = 60): string {
  const plain = stripChordBrackets(text).replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

export function isChordProSectionHeaderLine(line: string): boolean {
  return parseChordProSectionHeader(line) !== null;
}

export function parseChordProSectionHeader(line: string): string | null {
  const m = stripSectionHeaderAnnotation(line).match(SECTION_HEADER_RE);
  const inner = m?.[1]?.trim();
  if (!inner || bracketContentLooksLikeChordSymbol(inner)) return null;
  return inner;
}

/** Section type key for inheritance, e.g. `Verse 1` → `Verse`. */
export function chordProSectionTypeKey(header: string): string {
  return header.replace(/\s+\d+\s*$/, '').trim() || header;
}

export interface ChordProSection {
  header: string;
  typeKey: string;
  lines: string[];
}

export function parseChordProSections(document: string): ChordProSection[] {
  const lines = document.split('\n');
  const sections: ChordProSection[] = [];
  let current: ChordProSection | null = null;

  for (const line of lines) {
    const header = parseChordProSectionHeader(line);
    if (header) {
      current = { header, typeKey: chordProSectionTypeKey(header), lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { header: '', typeKey: '', lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }
  return sections;
}

/** Extract ordered chord symbols from a line or section body. */
export function extractChordSymbolsFromText(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(CHORD_TOKEN_RE)) {
    const sym = match[1]?.trim();
    if (sym) out.push(sym);
  }
  return out;
}

const SEMITONE_BY_NOTE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function parseRootSemitone(chord: string): number | null {
  const m = /^([A-G](?:#|b)?)/.exec(chord.trim());
  if (!m) return null;
  const root = m[1];
  return root ? (SEMITONE_BY_NOTE[root] ?? null) : null;
}

function transposeChordSymbol(chord: string, semitones: number): string {
  const rootMatch = /^([A-G](?:#|b)?)/.exec(chord);
  if (!rootMatch) return chord;
  const root = rootMatch[1];
  const base = root ? (SEMITONE_BY_NOTE[root] ?? 0) : 0;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const next = names[((base + semitones) % 12 + 12) % 12] ?? 'C';
  return chord.replace(/^[A-G](?:#|b)?/, next);
}

/** Transpose all inline chords by semitones (key change). */
export function transposeChordProDocument(text: string, semitones: number): string {
  if (semitones === 0) return text;
  return text.replace(CHORD_TOKEN_RE, (_full, inner: string) => {
    const sym = String(inner).trim();
    return `[${transposeChordSymbol(sym, semitones)}]`;
  });
}

export function semitonesBetweenKeys(fromKey: string, toKey: string): number {
  const a = parseRootSemitone(fromKey.replace(/m$/, ''));
  const b = parseRootSemitone(toKey.replace(/m$/, ''));
  if (a == null || b == null) return 0;
  return ((b - a) % 12 + 12) % 12;
}
