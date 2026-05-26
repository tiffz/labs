import type { ChartLayout, LyricLine } from './chordPro/chordChartLayout';

/** Align chord tokens over lyric words (monospace ASCII chart lines). */
export function alignChordsOverLyricLine(lyricLine: string, chordTokens: string[]): string {
  if (chordTokens.length === 0) return '';
  const starts = Array.from(lyricLine.matchAll(/\S+/g)).map((match) => match.index ?? 0);
  const slotCount = chordTokens.length;
  const anchors =
    starts.length > 0
      ? Array.from({ length: slotCount }, (_, slot) => {
          const ratio = slotCount === 1 ? 0 : slot / (slotCount - 1);
          const mapped = Math.floor(ratio * (starts.length - 1));
          return starts[Math.max(0, Math.min(starts.length - 1, mapped))];
        })
      : Array.from({ length: slotCount }, (_, slot) => slot * 4);
  const minimumChordWidth = chordTokens.reduce((sum, token) => sum + token.length + 2, 0) + 2;
  const buffer = Array.from({
    length: Math.max(lyricLine.length + 24, minimumChordWidth),
  }).fill(' ');
  let minStart = 0;
  anchors.forEach((anchor, tokenIndex) => {
    const token = chordTokens[tokenIndex] ?? '';
    if (!token) return;
    const start = Math.max(anchor, minStart);
    for (let offset = 0; offset < token.length; offset += 1) {
      const at = start + offset;
      if (at >= buffer.length) buffer.push(token[offset]);
      else buffer[at] = token[offset] ?? ' ';
    }
    minStart = start + token.length + 2;
  });
  return buffer.join('').trimEnd();
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

/** Build a monospace ASCII chord chart from structured chart layout. */
export function chartLayoutToAsciiExport(layout: ChartLayout): string {
  const blocks = layout.sections.map((section) => formatSectionBlock(`[${section.header}]`, section.lines));
  return blocks
    .map((lines) => lines.join('\n').trimEnd())
    .filter(Boolean)
    .join('\n\n');
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
}
