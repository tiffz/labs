import type { ChordMarker, LineToken, LyricLine } from './chordChartLayout';
import { snapChordColumnToCharIndex, tokenizeLyricLine } from './chordChartLayout';

export type WordAlignOp =
  | { op: 'equal'; oldIdx: number; newIdx: number }
  | { op: 'replace'; oldIdx: number; newIdx: number }
  | { op: 'delete'; oldIdx: number }
  | { op: 'insert'; newIdx: number };

function lyricWords(text: string): LineToken[] {
  return tokenizeLyricLine(text).filter((t) => /\S/.test(t.token));
}

/** Word-level edit script (Levenshtein backtrace). */
export function alignWordTokenEditScript(oldWords: LineToken[], newWords: LineToken[]): WordAlignOp[] {
  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) dp[i]![0] = i;
  for (let j = 1; j <= m; j += 1) dp[0]![j] = j;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const substitute =
        dp[i - 1]![j - 1]! +
        (oldWords[i - 1]!.token === newWords[j - 1]!.token ? 0 : 1);
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        substitute,
      );
    }
  }

  const ops: WordAlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const substitute =
        dp[i - 1]![j - 1]! +
        (oldWords[i - 1]!.token === newWords[j - 1]!.token ? 0 : 1);
      if (dp[i]![j] === substitute) {
        const oldIdx = i - 1;
        const newIdx = j - 1;
        ops.push(
          oldWords[oldIdx]!.token === newWords[newIdx]!.token
            ? { op: 'equal', oldIdx, newIdx }
            : { op: 'replace', oldIdx, newIdx },
        );
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      ops.push({ op: 'delete', oldIdx: i - 1 });
      i -= 1;
      continue;
    }
    ops.push({ op: 'insert', newIdx: j - 1 });
    j -= 1;
  }

  ops.reverse();
  return ops;
}

function wordIndexForCharIndex(text: string, charIndex: number): number {
  const words = lyricWords(text);
  if (words.length === 0) return -1;
  const snapped = snapChordColumnToCharIndex(charIndex, text);
  const idx = words.findIndex((w) => w.start === snapped);
  return idx >= 0 ? idx : 0;
}

function mapOldWordIndexToNew(
  ops: WordAlignOp[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const op of ops) {
    if (op.op === 'equal' || op.op === 'replace') {
      map.set(op.oldIdx, op.newIdx);
    }
  }
  return map;
}

/** Fraction of words preserved or replaced in place (not deleted). */
export function lineTextSimilarity(oldText: string, newText: string): number {
  if (oldText === newText) return 1;
  const oldWords = lyricWords(oldText);
  const newWords = lyricWords(newText);
  if (oldWords.length === 0 && newWords.length === 0) return 1;
  if (oldWords.length === 0 || newWords.length === 0) return 0;

  const ops = alignWordTokenEditScript(oldWords, newWords);
  const anchored = ops.filter((op) => op.op === 'equal' || op.op === 'replace').length;
  return anchored / Math.max(oldWords.length, newWords.length);
}

/**
 * Keep chord markers on the best matching lyric words after a line edit.
 * Uses word-level alignment so synonym swaps and typos keep chords on the same slot.
 */
export function reconcileChordsAfterTextChange(
  chords: ChordMarker[],
  oldText: string,
  newText: string,
): ChordMarker[] {
  if (oldText === newText) return chords;
  if (!newText.trim()) return [];
  if (chords.length === 0) return [];

  const oldWords = lyricWords(oldText);
  const newWords = lyricWords(newText);
  if (newWords.length === 0) return [];

  const ops = alignWordTokenEditScript(oldWords, newWords);
  const wordMap = mapOldWordIndexToNew(ops);

  const byWord = new Map<number, ChordMarker[]>();
  for (const chord of chords) {
    const oldWordIdx = wordIndexForCharIndex(oldText, chord.charIndex);
    const list = byWord.get(oldWordIdx) ?? [];
    list.push(chord);
    byWord.set(oldWordIdx, list);
  }

  const out: ChordMarker[] = [];
  for (const [oldWordIdx, markers] of byWord) {
    const newWordIdx = wordMap.get(oldWordIdx);
    if (newWordIdx == null) continue;
    const target = newWords[newWordIdx];
    if (!target) continue;
    for (const chord of markers) {
      out.push({ ...chord, charIndex: target.start });
    }
  }

  out.sort((a, b) => a.charIndex - b.charIndex || a.chordName.localeCompare(b.chordName));
  return out;
}

type LineAlignOp =
  | { op: 'equal'; oldIdx: number; newIdx: number }
  | { op: 'replace'; oldIdx: number; newIdx: number }
  | { op: 'delete'; oldIdx: number }
  | { op: 'insert'; newIdx: number };

function linePairCost(oldText: string, newText: string): number {
  if (oldText === newText) return 0;
  if (!oldText.trim() && !newText.trim()) return 0;
  const sim = lineTextSimilarity(oldText, newText);
  if (sim >= 0.85) return 1;
  if (sim >= 0.45) return 2;
  return 8;
}

function alignSectionLineIndices(oldLines: LyricLine[], newTexts: string[]): LineAlignOp[] {
  const n = oldLines.length;
  const m = newTexts.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) dp[i]![0] = i * 8;
  for (let j = 1; j <= m; j += 1) dp[0]![j] = j * 8;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const substitute = dp[i - 1]![j - 1]! + linePairCost(oldLines[i - 1]!.text, newTexts[j - 1]!);
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 8,
        dp[i]![j - 1]! + 8,
        substitute,
      );
    }
  }

  const ops: LineAlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const substitute = dp[i - 1]![j - 1]! + linePairCost(oldLines[i - 1]!.text, newTexts[j - 1]!);
      if (dp[i]![j] === substitute) {
        const oldIdx = i - 1;
        const newIdx = j - 1;
        ops.push(
          oldLines[oldIdx]!.text === newTexts[newIdx]
            ? { op: 'equal', oldIdx, newIdx }
            : { op: 'replace', oldIdx, newIdx },
        );
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 8) {
      ops.push({ op: 'delete', oldIdx: i - 1 });
      i -= 1;
      continue;
    }
    ops.push({ op: 'insert', newIdx: j - 1 });
    j -= 1;
  }

  ops.reverse();
  return ops;
}

/** Pair write-mode lyric lines with previous section lines for chord carry-over. */
export function matchWriteLinesToPrevious(
  prevLines: LyricLine[],
  newTexts: string[],
): Array<{ text: string; prevLine: LyricLine | null }> {
  if (newTexts.length === 0) return [];
  if (prevLines.length === 0) {
    return newTexts.map((text) => ({ text, prevLine: null }));
  }

  const ops = alignSectionLineIndices(prevLines, newTexts);
  const paired = new Map<number, LyricLine>();
  for (const op of ops) {
    if (op.op === 'equal' || op.op === 'replace') {
      paired.set(op.newIdx, prevLines[op.oldIdx]!);
    }
  }

  return newTexts.map((text, newIdx) => ({
    text,
    prevLine: paired.get(newIdx) ?? null,
  }));
}
