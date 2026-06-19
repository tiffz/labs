import { zineboxSearchTokens } from './zineboxLibrarySearch';

export type ZineboxSearchHighlightPart = { kind: 'text' | 'mark'; value: string };

type HighlightRange = { start: number; end: number };

function mergeHighlightRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: HighlightRange[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function findHighlightRanges(text: string, tokens: readonly string[]): HighlightRange[] {
  if (tokens.length === 0) return [];
  const lowerText = text.toLowerCase();
  const ranges: HighlightRange[] = [];
  for (const token of tokens) {
    if (!token) continue;
    let pos = 0;
    while (pos < lowerText.length) {
      const found = lowerText.indexOf(token, pos);
      if (found === -1) break;
      ranges.push({ start: found, end: found + token.length });
      pos = found + token.length;
    }
  }
  return mergeHighlightRanges(ranges);
}

/** Split display text into plain / highlighted spans for each search token (AND semantics). */
export function splitZineboxSearchHighlight(
  text: string,
  rawQuery: string,
): ZineboxSearchHighlightPart[] {
  const tokens = zineboxSearchTokens(rawQuery);
  if (!tokens.length) return [{ kind: 'text', value: text }];

  const ranges = findHighlightRanges(text, tokens);
  if (ranges.length === 0) return [{ kind: 'text', value: text }];

  const parts: ZineboxSearchHighlightPart[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ kind: 'text', value: text.slice(cursor, range.start) });
    }
    parts.push({ kind: 'mark', value: text.slice(range.start, range.end) });
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push({ kind: 'text', value: text.slice(cursor) });
  }
  return parts;
}
