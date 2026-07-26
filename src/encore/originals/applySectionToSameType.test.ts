import { describe, expect, it } from 'vitest';
import type {
  ChartLayout,
  LyricLine,
  SongSection,
} from '../../shared/music/chordPro/chordChartLayout';
import type { OriginalsSectionPlaybackOverride } from './sectionPlaybackOverrides';
import {
  applySectionChordsToSameType,
  applySectionDrumsToSameType,
  canApplySectionToSameType,
  countSameTypeSections,
  sectionTypePlural,
} from './applySectionToSameType';

let chordSeq = 0;
function line(text: string, chords: Array<{ name: string; at: number }> = []): LyricLine {
  return {
    lineId: `line-${(chordSeq += 1)}`,
    text,
    chords: chords.map((chord, index) => ({
      id: `chord-${chordSeq}-${index}`,
      chordName: chord.name,
      charIndex: chord.at,
    })),
  };
}

function section(
  sectionId: string,
  type: SongSection['type'],
  lines: LyricLine[],
): SongSection {
  return { sectionId, type, header: type, lines };
}

function chordNamesBySection(layout: ChartLayout): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const s of layout.sections) {
    result[s.sectionId] = s.lines.flatMap((l) => l.chords.map((c) => c.chordName));
  }
  return result;
}

describe('countSameTypeSections / canApplySectionToSameType', () => {
  const layout: ChartLayout = {
    sections: [
      section('verse-0', 'Verse', [line('one')]),
      section('chorus-0', 'Chorus', [line('hook')]),
      section('chorus-1', 'Chorus', [line('hook two')]),
    ],
  };

  it('counts sections of the same type including itself', () => {
    expect(countSameTypeSections(layout, 'chorus-0')).toBe(2);
    expect(countSameTypeSections(layout, 'verse-0')).toBe(1);
  });

  it('returns 0 for an unknown section id', () => {
    expect(countSameTypeSections(layout, 'missing')).toBe(0);
  });

  it('offers apply only when more than one section shares the type', () => {
    expect(canApplySectionToSameType(layout, 'chorus-0')).toBe(true);
    expect(canApplySectionToSameType(layout, 'verse-0')).toBe(false);
  });
});

describe('sectionTypePlural', () => {
  it('pluralizes known types and falls back to sections', () => {
    expect(sectionTypePlural('Verse')).toBe('verses');
    expect(sectionTypePlural('Chorus')).toBe('choruses');
    expect(sectionTypePlural('Bridge')).toBe('bridges');
    expect(sectionTypePlural('Other')).toBe('sections');
  });
});

describe('applySectionChordsToSameType', () => {
  it('copies chords to every same-type section and leaves other types untouched', () => {
    const layout: ChartLayout = {
      sections: [
        section('chorus-0', 'Chorus', [line('hold me now', [{ name: 'C', at: 0 }])]),
        section('chorus-1', 'Chorus', [line('let me go', [])]),
        section('verse-0', 'Verse', [line('a story', [{ name: 'G', at: 0 }])]),
      ],
    };

    const next = applySectionChordsToSameType(layout, 'chorus-0');
    const chords = chordNamesBySection(next);

    expect(chords['chorus-0']).toEqual(['C']);
    expect(chords['chorus-1']).toEqual(['C']);
    // Different type is not modified.
    expect(chords['verse-0']).toEqual(['G']);
    expect(next.sections[2]).toBe(layout.sections[2]);
  });

  it('snaps copied chord columns to the target line words and clears extra target lines', () => {
    const layout: ChartLayout = {
      sections: [
        section('chorus-0', 'Chorus', [line('one two', [{ name: 'Am', at: 7 }])]),
        section('chorus-1', 'Chorus', [
          line('alpha beta', []),
          line('gamma', [{ name: 'F', at: 0 }]),
        ]),
      ],
    };

    const next = applySectionChordsToSameType(layout, 'chorus-0');
    const target = next.sections.find((s) => s.sectionId === 'chorus-1')!;

    // Source column 7 snaps to the second word of "alpha beta" (word start 6).
    expect(target.lines[0].chords).toEqual([
      { id: expect.any(String), chordName: 'Am', charIndex: 6 },
    ]);
    // No source line at index 1 -> target's own chords cleared.
    expect(target.lines[1].chords).toEqual([]);
  });

  it('assigns fresh chord ids to copies', () => {
    const layout: ChartLayout = {
      sections: [
        section('chorus-0', 'Chorus', [line('x', [{ name: 'C', at: 0 }])]),
        section('chorus-1', 'Chorus', [line('y', [])]),
      ],
    };
    const source = layout.sections[0].lines[0].chords[0];
    const next = applySectionChordsToSameType(layout, 'chorus-0');
    const copy = next.sections[1].lines[0].chords[0];
    expect(copy.id).not.toBe(source.id);
  });

  it('returns layout unchanged for an unknown section', () => {
    const layout: ChartLayout = {
      sections: [section('chorus-0', 'Chorus', [line('x', [{ name: 'C', at: 0 }])])],
    };
    expect(applySectionChordsToSameType(layout, 'missing')).toBe(layout);
  });
});

describe('applySectionDrumsToSameType', () => {
  const layout: ChartLayout = {
    sections: [
      section('chorus-0', 'Chorus', [line('hook')]),
      section('chorus-1', 'Chorus', [line('hook two')]),
      section('verse-0', 'Verse', [line('story')]),
    ],
  };
  const custom: OriginalsSectionPlaybackOverride = {
    customPlayback: true,
    drumsEnabled: true,
    drumPattern: 'D-T-K-T-',
  };

  it('copies the source override to every same-type section, not other types', () => {
    const next = applySectionDrumsToSameType({ 'chorus-0': custom }, layout, 'chorus-0');
    expect(next?.['chorus-0']).toEqual(custom);
    expect(next?.['chorus-1']).toEqual(custom);
    expect(next?.['chorus-1']).not.toBe(next?.['chorus-0']);
    expect(next?.['verse-0']).toBeUndefined();
  });

  it('resets same-type siblings to inherit global when the source has no override', () => {
    const next = applySectionDrumsToSameType({ 'chorus-1': custom }, layout, 'chorus-0');
    // chorus-0 inherits global, so chorus-1's override is removed.
    expect(next?.['chorus-1']).toBeUndefined();
    expect(next).toBeUndefined();
  });

  it('preserves a different-type override while syncing same-type siblings', () => {
    const next = applySectionDrumsToSameType(
      { 'chorus-0': custom, 'verse-0': custom },
      layout,
      'chorus-0',
    );
    expect(next?.['verse-0']).toEqual(custom);
    expect(next?.['chorus-1']).toEqual(custom);
  });

  it('returns overrides unchanged for an unknown section', () => {
    const overrides = { 'chorus-0': custom };
    expect(applySectionDrumsToSameType(overrides, layout, 'missing')).toBe(overrides);
  });
});
