import { describe, expect, it } from 'vitest';
import { Accidental } from 'vexflow';

import {
  MAQAM_ACCIDENTALS,
  MAQAM_LETTERS,
  NATURAL_LETTER_SEMITONES,
  microtonalCentsOf,
  midiNoteOf,
  octaveCarryOf,
  pitchClassOf,
  spellingAriaLabel,
  spellingLabel,
  vexflowKey,
  type MaqamAccidentalCode,
} from './maqamAccidentals';

const ALL_CODES = Object.keys(MAQAM_ACCIDENTALS) as MaqamAccidentalCode[];

describe('maqam accidental table', () => {
  /**
   * The invariant the original spec broke: an accidental's cents, the key it
   * plays on, and the glyph it draws must describe the same pitch. Change any
   * one of the three in isolation and this fails.
   */
  it('keeps cents, semitone shift, and microtonal remainder consistent', () => {
    for (const code of ALL_CODES) {
      const acc = MAQAM_ACCIDENTALS[code];
      expect(
        acc.cents,
        `${code}: cents must equal 100 * semitoneShift + microtonalCents`,
      ).toBe(100 * acc.semitoneShift + acc.microtonalCents);
    }
  });

  it('marks exactly the accidentals that leave 12-TET as microtonal', () => {
    for (const code of ALL_CODES) {
      const acc = MAQAM_ACCIDENTALS[code];
      expect(acc.isMicrotonal, `${code}`).toBe(acc.microtonalCents !== 0);
    }
  });

  it('keeps every microtonal remainder inside one semitone', () => {
    for (const code of ALL_CODES) {
      const acc = MAQAM_ACCIDENTALS[code];
      expect(Math.abs(acc.microtonalCents), `${code}`).toBeLessThan(100);
    }
  });

  /**
   * Every code we ship must be one VexFlow actually knows. `new Accidental()`
   * with an unknown code throws, which is how a typo'd glyph would otherwise
   * reach the staff as a runtime crash instead of a test failure.
   */
  it('uses codes VexFlow 5 accepts', () => {
    for (const code of ALL_CODES) {
      expect(() => new Accidental(code), `${code}`).not.toThrow();
    }
  });

  /**
   * The record key IS the VexFlow code — `drawMaqamStaff` passes a spelling's
   * `accidental` straight to `new Accidental()` and never reads `.code`. So the
   * field is a mirror, and a mirror that can drift is a second source of truth:
   * editing `.code` alone would change nothing on screen while making the table
   * lie about what it draws.
   */
  it('keeps each record’s code identical to its key', () => {
    for (const code of ALL_CODES) {
      expect(MAQAM_ACCIDENTALS[code].code, `${code}`).toBe(code);
    }
  });

  /**
   * The specific confusion that motivated this module, pinned so nobody
   * "simplifies" the half-flat back to `'db'`. `d` is the quarter-tone flat
   * (Stein); `db` is the three-quarter-tone flat (Zimmermann). They differ by
   * 100 cents, and only one of them is the maqam half-flat.
   */
  it('maps the half-flat to `d`, not `db`', () => {
    expect(MAQAM_ACCIDENTALS.d.cents).toBe(-50);
    expect(MAQAM_ACCIDENTALS.d.label).toBe('half-flat');
    expect(MAQAM_ACCIDENTALS.db.cents).toBe(-150);
    expect(MAQAM_ACCIDENTALS.db.label).toBe('three-quarter-flat');
    expect(MAQAM_ACCIDENTALS.d.cents).not.toBe(MAQAM_ACCIDENTALS.db.cents);
  });

  it('maps the half-sharp to `+`, not `#`', () => {
    expect(MAQAM_ACCIDENTALS['+'].cents).toBe(50);
    expect(MAQAM_ACCIDENTALS['#'].cents).toBe(100);
  });
});

describe('spelling arithmetic', () => {
  it('places natural letters on their 12-TET pitch classes', () => {
    expect(pitchClassOf({ letter: 'C', accidental: 'n' })).toBe(0);
    expect(pitchClassOf({ letter: 'E', accidental: 'n' })).toBe(4);
    expect(pitchClassOf({ letter: 'B', accidental: 'n' })).toBe(11);
  });

  it('plays a half-flat on the natural key, bent down 50 cents', () => {
    const eHalfFlat = { letter: 'E', accidental: 'd' } as const;
    expect(pitchClassOf(eHalfFlat)).toBe(4);
    expect(microtonalCentsOf(eHalfFlat)).toBe(-50);
  });

  it('plays a flat on the key below, unbent', () => {
    const bFlat = { letter: 'B', accidental: 'b' } as const;
    expect(pitchClassOf(bFlat)).toBe(10);
    expect(microtonalCentsOf(bFlat)).toBe(0);
  });

  it('plays a three-quarter-flat on the flat key, bent down 50 cents', () => {
    const bThreeQuarterFlat = { letter: 'B', accidental: 'db' } as const;
    expect(pitchClassOf(bThreeQuarterFlat)).toBe(10);
    expect(microtonalCentsOf(bThreeQuarterFlat)).toBe(-50);
  });

  it('wraps B# up into the next octave and Cb down into the previous one', () => {
    expect(pitchClassOf({ letter: 'B', accidental: '#' })).toBe(0);
    expect(octaveCarryOf({ letter: 'B', accidental: '#' })).toBe(1);
    expect(pitchClassOf({ letter: 'C', accidental: 'b' })).toBe(11);
    expect(octaveCarryOf({ letter: 'C', accidental: 'b' })).toBe(-1);
  });

  it('never reports an octave carry for a spelling that stays in its octave', () => {
    for (const letter of MAQAM_LETTERS) {
      expect(octaveCarryOf({ letter, accidental: 'n' }), letter).toBe(0);
    }
  });

  it('numbers middle C as MIDI 60', () => {
    expect(midiNoteOf({ letter: 'C', accidental: 'n' }, 4)).toBe(60);
    expect(midiNoteOf({ letter: 'A', accidental: 'n' }, 4)).toBe(69);
    expect(midiNoteOf({ letter: 'E', accidental: 'd' }, 4)).toBe(64);
    expect(midiNoteOf({ letter: 'B', accidental: 'b' }, 4)).toBe(70);
  });

  it('agrees with pitchClassOf about which key a MIDI note lands on', () => {
    for (const letter of MAQAM_LETTERS) {
      for (const code of ALL_CODES) {
        const spelling = { letter, accidental: code };
        const midi = midiNoteOf(spelling, 4);
        expect(midi % 12, `${letter}${code}`).toBe(pitchClassOf(spelling));
      }
    }
  });

  it('derives the natural-letter semitones from a seven-letter octave', () => {
    const semitones = MAQAM_LETTERS.map((l) => NATURAL_LETTER_SEMITONES[l]);
    expect(semitones).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe('spelling labels', () => {
  it('omits the natural sign in display names', () => {
    expect(spellingLabel({ letter: 'C', accidental: 'n' })).toBe('C');
    expect(spellingAriaLabel({ letter: 'C', accidental: 'n' })).toBe('C');
  });

  it('spells microtones out for screen readers', () => {
    expect(spellingLabel({ letter: 'E', accidental: 'd' })).toBe('E½♭');
    expect(spellingAriaLabel({ letter: 'E', accidental: 'd' })).toBe('E half-flat');
  });

  it('builds VexFlow keys from the letter and octave only', () => {
    expect(vexflowKey({ letter: 'E', accidental: 'd' }, 4)).toBe('e/4');
    expect(vexflowKey({ letter: 'B', accidental: 'b' }, 5)).toBe('b/5');
  });
});
