import { describe, it, expect } from 'vitest';
import { scoreToAbc, abcToScore, getKeySigAccidentals } from './abcNotation';
import type { PianoScore } from '../types';
import { generateNoteId } from '../types';

function makeScore(overrides?: Partial<PianoScore>): PianoScore {
  return {
    id: 'test',
    title: 'Test',
    key: 'C',
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 120,
    parts: [
      { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: [{ notes: [] }] },
      { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
    ],
    ...overrides,
  };
}

describe('scoreToAbc', () => {
  it('serializes a C major scale', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [
              { id: generateNoteId(), pitches: [60], duration: 'quarter' },
              { id: generateNoteId(), pitches: [62], duration: 'quarter' },
              { id: generateNoteId(), pitches: [64], duration: 'quarter' },
              { id: generateNoteId(), pitches: [65], duration: 'quarter' },
            ],
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('V:rh clef=treble');
    expect(abc).toContain('C D E F');
  });

  it('serializes rests', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [
              { id: generateNoteId(), pitches: [], duration: 'half', rest: true },
              { id: generateNoteId(), pitches: [60], duration: 'half' },
            ],
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('z2 C2');
  });

  it('serializes dotted notes', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [
              { id: generateNoteId(), pitches: [60], duration: 'quarter', dotted: true },
              { id: generateNoteId(), pitches: [62], duration: 'eighth' },
            ],
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('C3/2 D/2');
  });

  it('serializes chords', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [
              { id: generateNoteId(), pitches: [60, 64, 67], duration: 'half' },
            ],
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('[CEG]2');
  });

  it('serializes multiple measures with barlines', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [
            { notes: [{ id: generateNoteId(), pitches: [60], duration: 'whole' }] },
            { notes: [{ id: generateNoteId(), pitches: [62], duration: 'whole' }] },
          ],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('C4 | D4');
  });

  it('serializes both hands', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{ notes: [{ id: generateNoteId(), pitches: [72], duration: 'quarter' }] }],
        },
        {
          id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left',
          measures: [{ notes: [{ id: generateNoteId(), pitches: [48], duration: 'quarter' }] }],
        },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain('V:rh clef=treble');
    expect(abc).toContain('V:lh clef=bass');
    // C5 = lowercase c, C3 = uppercase C,,
    expect(abc).toContain('c');
    expect(abc).toContain('C,');
  });

  it('handles octave notation correctly', () => {
    const score = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [
              { id: generateNoteId(), pitches: [84], duration: 'quarter' }, // C6 = c'
              { id: generateNoteId(), pitches: [60], duration: 'quarter' }, // C4 = C
              { id: generateNoteId(), pitches: [48], duration: 'quarter' }, // C3 = C,
              { id: generateNoteId(), pitches: [36], duration: 'quarter' }, // C2 = C,,
            ],
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(score);
    expect(abc).toContain("c'");
    expect(abc).toMatch(/\bC\b/);
    expect(abc).toContain('C,');
    expect(abc).toContain('C,,');
  });
});

describe('abcToScore', () => {
  const base = makeScore();

  it('parses simple quarter notes', () => {
    const score = abcToScore('C D E F', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes).toHaveLength(4);
    expect(rh.measures[0].notes[0].pitches[0]).toBe(60); // C4
    expect(rh.measures[0].notes[1].pitches[0]).toBe(62); // D4
    expect(rh.measures[0].notes[2].pitches[0]).toBe(64); // E4
    expect(rh.measures[0].notes[3].pitches[0]).toBe(65); // F4
    expect(rh.measures[0].notes[0].duration).toBe('quarter');
  });

  it('parses half and whole notes', () => {
    const score = abcToScore('C2 | D4', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].duration).toBe('half');
    expect(rh.measures[1].notes[0].duration).toBe('whole');
  });

  it('parses eighth and sixteenth notes', () => {
    const score = abcToScore('C/2 D/4', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].duration).toBe('eighth');
    expect(rh.measures[0].notes[1].duration).toBe('sixteenth');
  });

  it('parses rests', () => {
    const score = abcToScore('z C z2', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].rest).toBe(true);
    expect(rh.measures[0].notes[0].duration).toBe('quarter');
    expect(rh.measures[0].notes[1].pitches[0]).toBe(60);
    expect(rh.measures[0].notes[2].rest).toBe(true);
    expect(rh.measures[0].notes[2].duration).toBe('half');
  });

  it('parses chords', () => {
    const score = abcToScore('[CEG]2', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].pitches).toEqual([60, 64, 67]);
    expect(rh.measures[0].notes[0].duration).toBe('half');
  });

  it('parses accidentals', () => {
    const score = abcToScore('^C _E', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].pitches[0]).toBe(61); // C#4
    expect(rh.measures[0].notes[1].pitches[0]).toBe(63); // Eb4
  });

  it('parses octave modifiers', () => {
    const score = abcToScore("c c' C C,", base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].pitches[0]).toBe(72); // C5
    expect(rh.measures[0].notes[1].pitches[0]).toBe(84); // C6
    expect(rh.measures[0].notes[2].pitches[0]).toBe(60); // C4
    expect(rh.measures[0].notes[3].pitches[0]).toBe(48); // C3
  });

  it('parses barlines as measure boundaries', () => {
    const score = abcToScore('C D E F | G A B c', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures).toHaveLength(2);
    expect(rh.measures[0].notes).toHaveLength(4);
    expect(rh.measures[1].notes).toHaveLength(4);
  });

  it('parses voice declarations', () => {
    const score = abcToScore('V:rh clef=treble\nC D\nV:lh clef=bass\nC, D,', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    const lh = score.parts.find(p => p.id === 'lh')!;
    expect(rh.measures[0].notes).toHaveLength(2);
    expect(rh.measures[0].notes[0].pitches[0]).toBe(60);
    expect(lh.measures[0].notes).toHaveLength(2);
    expect(lh.measures[0].notes[0].pitches[0]).toBe(48);
  });

  it('parses dotted notes (3/2 multiplier)', () => {
    const score = abcToScore('C3/2 D/2', base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].duration).toBe('quarter');
    expect(rh.measures[0].notes[0].dotted).toBe(true);
    expect(rh.measures[0].notes[1].duration).toBe('eighth');
  });
});

describe('roundtrip: scoreToAbc -> abcToScore', () => {
  it('preserves a simple C major scale', () => {
    const original = makeScore({
      parts: [
        {
          id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right',
          measures: [{
            notes: [60, 62, 64, 65].map(p => ({
              id: generateNoteId(), pitches: [p], duration: 'quarter' as const,
            })),
          }],
        },
        { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
      ],
    });
    const abc = scoreToAbc(original);
    const roundtripped = abcToScore(abc, original);
    const rhOrig = original.parts.find(p => p.id === 'rh')!;
    const rhRt = roundtripped.parts.find(p => p.id === 'rh')!;
    expect(rhRt.measures[0].notes).toHaveLength(rhOrig.measures[0].notes.length);
    for (let i = 0; i < rhOrig.measures[0].notes.length; i++) {
      expect(rhRt.measures[0].notes[i].pitches).toEqual(rhOrig.measures[0].notes[i].pitches);
      expect(rhRt.measures[0].notes[i].duration).toBe(rhOrig.measures[0].notes[i].duration);
    }
  });
});

describe('getKeySigAccidentals', () => {
  it('returns empty for C major', () => {
    expect(getKeySigAccidentals('C')).toEqual({});
  });

  it('returns F# for G major', () => {
    const acc = getKeySigAccidentals('G');
    expect(acc).toEqual({ F: 1 });
  });

  it('returns Bb for F major', () => {
    const acc = getKeySigAccidentals('F');
    expect(acc).toEqual({ B: -1 });
  });

  it('returns F# C# for D major', () => {
    const acc = getKeySigAccidentals('D');
    expect(acc).toEqual({ F: 1, C: 1 });
  });

  it('handles minor keys via relative major', () => {
    // Am = C major (no accidentals)
    expect(getKeySigAccidentals('Am')).toEqual({});
    // Em = G major (F#)
    expect(getKeySigAccidentals('Em')).toEqual({ F: 1 });
  });
});

describe('abcToScore with ABC headers', () => {
  const base = makeScore();

  it('parses K: header and applies key signature', () => {
    const abc = 'K:G\nF G A B';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    // In K:G, F means F# (MIDI 66)
    expect(rh.measures[0].notes[0].pitches[0]).toBe(66);
    expect(rh.measures[0].notes[1].pitches[0]).toBe(67); // G4
    expect(score.key).toBe('G');
  });

  it('parses =F as F natural in K:G', () => {
    const abc = 'K:G\n=F G';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].pitches[0]).toBe(65); // F natural
    expect(rh.measures[0].notes[1].pitches[0]).toBe(67); // G
  });

  it('parses M: header to set time signature', () => {
    const abc = 'M:6/8\nK:C\nC D E F G A';
    const score = abcToScore(abc, base);
    expect(score.timeSignature).toEqual({ numerator: 6, denominator: 8 });
  });

  it('parses L:1/8 and treats bare notes as eighth notes', () => {
    const abc = 'L:1/8\nK:C\nC D E F';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].duration).toBe('eighth');
    expect(rh.measures[0].notes[0].pitches[0]).toBe(60);
  });

  it('parses L:1/8 with d2 as quarter note', () => {
    const abc = 'L:1/8\nK:C\nd2 C';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures[0].notes[0].duration).toBe('quarter');
    expect(rh.measures[0].notes[0].pitches[0]).toBe(74); // D5
  });

  it('parses T: header to set title', () => {
    const abc = 'T:My Tune\nK:C\nC D E F';
    const score = abcToScore(abc, base);
    expect(score.title).toBe('My Tune');
  });

  it('handles repeat markers as barlines', () => {
    const abc = 'K:C\nC D |: E F :| G A';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    expect(rh.measures.length).toBeGreaterThanOrEqual(3);
  });

  it('handles first/second endings', () => {
    const abc = 'K:C\nC D |1 E F :|2 G A |';
    const score = abcToScore(abc, base);
    const rh = score.parts.find(p => p.id === 'rh')!;
    const allNotes = rh.measures.flatMap(m => m.notes);
    expect(allNotes.length).toBe(6); // C D E F G A
  });

  it('parses the Legacy Jig from Wikipedia', () => {
    const abc = `X:1
T:The Legacy Jig
M:6/8
L:1/8
R:jig
K:G
GFG BAB | gfg gab | GFG BAB | d2A AFD |
GFG BAB | gfg gab | age edB |1 dBA AFD :|2 dBA ABd |:
efe edB | dBA ABd | efe edB | gdB ABd |
efe edB | d2d def | gfe edB |1 dBA ABd :|2 dBA AFD |]`;
    const score = abcToScore(abc, base);

    expect(score.title).toBe('The Legacy Jig');
    expect(score.timeSignature).toEqual({ numerator: 6, denominator: 8 });
    expect(score.key).toBe('G');

    const rh = score.parts.find(p => p.id === 'rh')!;
    // Should have parsed many notes
    const totalNotes = rh.measures.reduce((sum, m) => sum + m.notes.length, 0);
    expect(totalNotes).toBeGreaterThan(50);

    // First three notes should be G4 F#4 G4 (all eighth notes in K:G with L:1/8)
    expect(rh.measures[0].notes[0].pitches[0]).toBe(67); // G4
    expect(rh.measures[0].notes[0].duration).toBe('eighth');
    expect(rh.measures[0].notes[1].pitches[0]).toBe(66); // F#4 (F in K:G)
    expect(rh.measures[0].notes[2].pitches[0]).toBe(67); // G4

    // Second measure starts with 'g' = G5 (lowercase)
    const secondMeasureFirstNote = rh.measures[1].notes[0];
    expect(secondMeasureFirstNote.pitches[0]).toBe(79); // G5
  });
});
