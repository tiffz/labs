import { describe, expect, it } from 'vitest';
import { parseWriteDocumentToLayout, parseChordProToChartLayout } from './chordChartLayout';
import {
  lineTextSimilarity,
  matchWriteLinesToPrevious,
  reconcileChordsAfterTextChange,
} from './chordLyricReconcile';
import type { LyricLine } from './chordChartLayout';

describe('reconcileChordsAfterTextChange', () => {
  it('shifts chords when words are inserted before the anchor word', () => {
    const next = reconcileChordsAfterTextChange(
      [{ id: '1', chordName: 'G', charIndex: 6 }],
      'Hello world',
      'Hello there world',
    );
    expect(next[0]?.charIndex).toBe(12);
    expect(next[0]?.chordName).toBe('G');
  });

  it('keeps chords when a single word is swapped for another', () => {
    const oldText = "The lawns aren't quite so pretty";
    const newText = "The lawns aren't really so pretty";
    const prettyStart = oldText.indexOf('pretty');
    const next = reconcileChordsAfterTextChange(
      [
        { id: '1', chordName: 'Am', charIndex: 0 },
        { id: '2', chordName: 'F', charIndex: oldText.indexOf('quite') },
        { id: '3', chordName: 'C', charIndex: prettyStart },
      ],
      oldText,
      newText,
    );
    expect(next.map((c) => [c.chordName, c.charIndex])).toEqual([
      ['Am', 0],
      ['F', newText.indexOf('really')],
      ['C', newText.indexOf('pretty')],
    ]);
  });

  it('moves chords to a replaced word at the same slot', () => {
    const next = reconcileChordsAfterTextChange(
      [
        { id: '1', chordName: 'C', charIndex: 0 },
        { id: '2', chordName: 'G', charIndex: 4 },
      ],
      'abc def',
      'xyz def',
    );
    expect(next.map((c) => [c.chordName, c.charIndex])).toEqual([
      ['C', 0],
      ['G', 4],
    ]);
  });

  it('drops chords on deleted words', () => {
    const next = reconcileChordsAfterTextChange(
      [{ id: '1', chordName: 'F', charIndex: 6 }],
      'Hello pretty world',
      'Hello world',
    );
    expect(next).toEqual([]);
  });

  it('clears chords when the line is emptied', () => {
    const next = reconcileChordsAfterTextChange(
      [{ id: '1', chordName: 'C', charIndex: 0 }],
      'Hook line',
      '',
    );
    expect(next).toEqual([]);
  });
});

describe('matchWriteLinesToPrevious', () => {
  const line = (text: string, chords: LyricLine['chords'] = []): LyricLine => ({
    lineId: text,
    text,
    chords,
  });

  it('pairs edited lines by similarity instead of raw index after insertions', () => {
    const prev = [
      line('Line one', [{ id: '1', chordName: 'C', charIndex: 0 }]),
      line('Line two', [{ id: '2', chordName: 'G', charIndex: 0 }]),
    ];
    const matched = matchWriteLinesToPrevious(prev, ['', 'Line one', 'Line two edited']);
    expect(matched[1]?.prevLine?.text).toBe('Line one');
    expect(matched[2]?.prevLine?.text).toBe('Line two');
  });
});

describe('parseWriteDocumentToLayout with smart reconcile', () => {
  it('preserves chords when one word changes on a line', () => {
    const layout = parseChordProToChartLayout(`[Verse 1]
[C]The lawns aren't quite so [F]pretty`);
    const writeDoc = `[Verse 1]
The lawns aren't really so pretty`;
    const next = parseWriteDocumentToLayout(writeDoc, layout);
    const chords = next.sections[0]?.lines[0]?.chords ?? [];
    expect(chords.map((c) => c.chordName).sort()).toEqual(['C', 'F']);
  });

  it('drops chords when an entire section is removed from the write doc', () => {
    const layout = parseChordProToChartLayout(`[Verse 1]
[C]Line one

[Chorus]
[G]Hook`);
    const writeDoc = `[Verse 1]
Line one`;
    const next = parseWriteDocumentToLayout(writeDoc, layout);
    expect(next.sections).toHaveLength(1);
    expect(next.sections[0]?.lines[0]?.chords[0]?.chordName).toBe('C');
  });
});

describe('lineTextSimilarity', () => {
  it('scores identical lines as 1', () => {
    expect(lineTextSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('scores single-word edits highly', () => {
    expect(lineTextSimilarity("The lawns aren't quite so pretty", "The lawns aren't really so pretty")).toBeGreaterThan(
      0.8,
    );
  });
});
