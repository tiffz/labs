// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MEET_ME_AROUND_LYRIC } from './fixtures';
import { parsePastedChartToChartLayout } from './pastedChartImport';
import {
  assignChordCharIndicesFromColumns,
  groupChordsByTokenStart,
  layoutToWriteDocument,
  moveChordById,
  parseChordProToChartLayout,
  parseWriteDocumentToLayout,
  reconcileChordsAfterTextChange,
  removeChordById,
  serializeChartLayoutToChordPro,
  snapChordColumnToCharIndex,
  tokenizeLyricLine,
  upsertChordAtIndex,
} from './chordChartLayout';

describe('chordChartLayout', () => {
  it('round-trips ChordPro through layout', () => {
    const doc = `[Verse 1]
[Fm]I'm not like [Bb]you

[Chorus]
[C]Hook line`;
    const layout = parseChordProToChartLayout(doc);
    expect(layout.sections[0]?.lines[0]?.text).toBe("I'm not like you");
    expect(layout.sections[0]?.lines[0]?.chords).toEqual([
      expect.objectContaining({ chordName: 'Fm', charIndex: 0 }),
      expect.objectContaining({ chordName: 'Bb', charIndex: 13 }),
    ]);
    expect(serializeChartLayoutToChordPro(layout)).toBe(doc);
  });

  it('reconciles chord indices when text is inserted before a marker', () => {
    const next = reconcileChordsAfterTextChange(
      [{ id: '1', chordName: 'G', charIndex: 6 }],
      'Hello world',
      'Hello there world',
    );
    expect(next[0]?.charIndex).toBe(12);
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

  it('separates sections with a blank line in write documents', () => {
    const layout = parseChordProToChartLayout(`[Verse 1]\nLine one\n\n[Chorus]\nHook`);
    expect(layoutToWriteDocument(layout)).toBe(`[Verse 1]
Line one

[Chorus]
Hook`);
  });

  it('preserves multiple blank lines between sections in write documents', () => {
    const layout = parseWriteDocumentToLayout(
      `[Verse 1]
Line one


[Chorus]
Hook`,
      parseChordProToChartLayout(''),
    );
    // Inter-section spacing normalizes to a single blank line; intra-section blanks round-trip.
    expect(layoutToWriteDocument(layout)).toBe(`[Verse 1]
Line one

[Chorus]
Hook`);
  });

  it('preserves chords when write document changes lyrics only', () => {
    const layout = parseChordProToChartLayout(`[Verse 1]\n[C]Hello`);
    const writeDoc = `[Verse 1]\nHello there`;
    const next = parseWriteDocumentToLayout(writeDoc, layout);
    expect(next.sections[0]?.lines[0]?.chords[0]?.chordName).toBe('C');
  });

  it('upserts chord at token index', () => {
    const line = upsertChordAtIndex({ lineId: 'l', text: 'word', chords: [] }, 0, 'Am');
    expect(line.chords[0]?.chordName).toBe('Am');
  });

  it('serializes chord-only instrumental lines', () => {
    const layout = parsePastedChartToChartLayout(`Bridge
Ab     Bb
[Instrumental]`);
    expect(serializeChartLayoutToChordPro(layout)).toContain('[Instrumental]\n[Ab][Bb]');
  });

  it('does not treat chord-only lines as new sections on round-trip', () => {
    const layout = parseChordProToChartLayout(`[Chorus]
[F]Let it crash, let it pour.`);
    const withLeadingChordOnly: typeof layout = {
      sections: [
        {
          ...layout.sections[0]!,
          lines: [
            {
              lineId: 'chord-only',
              text: '',
              chords: [{ id: 'c1', chordName: 'Dm', charIndex: 0 }],
            },
            ...layout.sections[0]!.lines,
          ],
        },
      ],
    };
    const serialized = serializeChartLayoutToChordPro(withLeadingChordOnly);
    expect(serialized).toContain('[Dm]');
    const roundTripped = parseChordProToChartLayout(serialized);
    expect(roundTripped.sections).toHaveLength(1);
    expect(roundTripped.sections[0]?.header).toBe('Chorus');
    expect(roundTripped.sections[0]?.lines[0]?.chords[0]?.chordName).toBe('Dm');
  });

  it('allows removing the only section header in write mode', () => {
    const layout = parseChordProToChartLayout(`[Verse 1]\nHello`);
    const next = parseWriteDocumentToLayout('Hello', layout);
    expect(next.sections[0]?.header).toBe('');
    expect(next.sections[0]?.lines[0]?.text).toBe('Hello');
  });

  it('snaps chord columns to word starts and trailing chords to the last word', () => {
    const lyric = "You'll have to show me around";
    expect(snapChordColumnToCharIndex(0, lyric)).toBe(0);
    expect(snapChordColumnToCharIndex(34, lyric)).toBe(lyric.indexOf('around'));
    expect(snapChordColumnToCharIndex(43, lyric)).toBe(lyric.indexOf('around'));

    const placed = assignChordCharIndicesFromColumns(
      [
        { chord: 'Fm', column: 0 },
        { chord: 'Bb', column: 34 },
        { chord: 'Eb', column: 43 },
      ],
      lyric,
    );
    expect(placed.map((p) => [p.chord, p.charIndex])).toEqual([
      ['Fm', 0],
      ['Bb', lyric.indexOf('around')],
      ['Eb', lyric.indexOf('around')],
    ]);
  });

  it('groups multiple chords on the same word for paint display', () => {
    const line = {
      lineId: 'l',
      text: "You'll have to show me around",
      chords: [
        { id: '1', chordName: 'Fm', charIndex: 0 },
        { id: '2', chordName: 'Bb', charIndex: 29 },
        { id: '3', chordName: 'Eb', charIndex: 29 },
      ],
    };
    const groups = groupChordsByTokenStart(line);
    expect(groups.get(line.text.indexOf('around'))?.map((c) => c.id)).toEqual(['2', '3']);
  });

  it('removes only the targeted chord when multiple share a word index', () => {
    const line = {
      lineId: 'l',
      text: 'around',
      chords: [
        { id: 'a', chordName: 'Bb', charIndex: 0 },
        { id: 'b', chordName: 'Eb', charIndex: 0 },
      ],
    };
    const next = removeChordById(line, 'a');
    expect(next.chords).toEqual([expect.objectContaining({ id: 'b', chordName: 'Eb' })]);
  });

  it('moves only the targeted chord when multiple share a word index', () => {
    const tokens = tokenizeLyricLine(`${MEET_ME_AROUND_LYRIC} here`);
    const aroundStart = tokens.find((t) => t.token === 'around')!.start;
    const hereStart = tokens.find((t) => t.token === 'here')!.start;
    const line = {
      lineId: 'l',
      text: `${MEET_ME_AROUND_LYRIC} here`,
      chords: [
        { id: 'a', chordName: 'Bb', charIndex: aroundStart },
        { id: 'b', chordName: 'Eb', charIndex: aroundStart },
      ],
    };
    const next = moveChordById(line, 'a', hereStart);
    expect(next.chords).toEqual([
      expect.objectContaining({ id: 'b', chordName: 'Eb', charIndex: aroundStart }),
      expect.objectContaining({ id: 'a', chordName: 'Bb', charIndex: hereStart }),
    ]);
  });
});

/**
 * Write Mode shows lyrics only, so a chord-only line is a blank line there. The first edit used to
 * erase every chord-only line at the end of a section, which for an instrumental (all chord-only
 * lines) meant the whole chart. Parametrised over the shapes that put chord-only lines at a
 * section's end, where the trim lived, and in the last section, where a second trim lived.
 */
describe('Write Mode keeps chord-only lines', () => {
  const chordsOf = (chordPro: string) =>
    parseChordProToChartLayout(chordPro).sections.flatMap((s) => s.lines.flatMap((l) => l.chords.map((c) => c.chordName)));

  const CHARTS: Record<string, string> = {
    'an instrumental (every line chord-only)': '[Intro]\n[Am][F][C][G]\n[Am][F][C][G]\n\n[Solo]\n[Dm][G]\n[C]',
    'a chord-only line ending a lyric section': '[Verse]\n[C]Hello [G]world\n[Am][F]\n\n[Chorus]\n[F]Sing',
    'a chord-only outro as the last section': '[Verse]\n[C]Hello\n\n[Outro]\n[C][G][Am]',
    'chord-only lines between lyrics': '[Verse]\n[C]Hello\n[F][G]\n[C]Bye',
  };

  for (const [name, chart] of Object.entries(CHARTS)) {
    it(`survives an edit: ${name}`, () => {
      const layout = parseChordProToChartLayout(chart);
      const doc = layoutToWriteDocument(layout);
      // An edit elsewhere in the chart: rename the first header.
      const edited = doc.replace(/^\[([^\]]+)\]/, '[$1 again]');
      const after = serializeChartLayoutToChordPro(parseWriteDocumentToLayout(edited, layout));
      expect(chordsOf(after)).toEqual(chordsOf(chart));
    });

    it(`is stable over repeated round trips: ${name}`, () => {
      let layout = parseChordProToChartLayout(chart);
      const first = serializeChartLayoutToChordPro(parseWriteDocumentToLayout(layoutToWriteDocument(layout), layout));
      for (let i = 0; i < 3; i += 1) {
        layout = parseWriteDocumentToLayout(layoutToWriteDocument(layout), layout);
      }
      expect(serializeChartLayoutToChordPro(layout)).toBe(first);
    });
  }
});
