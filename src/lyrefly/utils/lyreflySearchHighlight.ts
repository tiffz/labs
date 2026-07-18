export type LyreflySearchHighlightPart = { kind: 'text' | 'mark'; value: string };

/** Split display text into plain / highlighted spans for a case-insensitive substring query. */
export function splitLyreflySearchHighlight(
  text: string,
  rawQuery: string,
): LyreflySearchHighlightPart[] {
  const needle = rawQuery.trim();
  if (!needle) return [{ kind: 'text', value: text }];

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: LyreflySearchHighlightPart[] = [];
  let pos = 0;
  while (pos < text.length) {
    const found = lowerText.indexOf(lowerNeedle, pos);
    if (found === -1) {
      parts.push({ kind: 'text', value: text.slice(pos) });
      break;
    }
    if (found > pos) {
      parts.push({ kind: 'text', value: text.slice(pos, found) });
    }
    parts.push({ kind: 'mark', value: text.slice(found, found + needle.length) });
    pos = found + needle.length;
  }
  return parts.length > 0 ? parts : [{ kind: 'text', value: text }];
}
