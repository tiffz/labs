import { describe, expect, it } from 'vitest';

import {
  bentPitchClasses,
  buildKeyTunings,
  formatCents,
  matrixMatchesPreset,
  toggleDetuneSlot,
} from './maqamTuning';
import {
  MAQAM_PRESETS,
  MAQAM_PRESETS_BY_ID,
  NEUTRAL_DETUNE_MATRIX,
  deriveDetuneMatrix,
} from '../data/maqamPresets';

const rast = MAQAM_PRESETS_BY_ID.rast_c;
const rastMatrix = deriveDetuneMatrix(rast.scaleDegrees).matrix;

describe('buildKeyTunings', () => {
  it('covers all twelve keys in pitch-class order', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings).toHaveLength(12);
    expect(tunings.map((t) => t.pitchClass)).toEqual([...Array(12).keys()]);
  });

  it('marks the maqam’s home note as the tonic', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[0].role).toBe('tonic'); // C
    expect(tunings[0].label).toBe('C');
  });

  it('marks bent scale degrees microtonal and labels them as written', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[4].role).toBe('microtonal'); // E
    expect(tunings[4].label).toBe('E½♭');
    expect(tunings[4].badge).toBe('½♭');
    expect(tunings[4].cents).toBe(-50);
  });

  it('marks unbent scale degrees as plain scale keys', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[2].role).toBe('scale'); // D
    expect(tunings[5].role).toBe('scale'); // F
  });

  it('marks keys the maqam never uses as outside it', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[1].role).toBe('outside'); // C#
    expect(tunings[6].role).toBe('outside'); // F#
    expect(tunings[1].label).toBeUndefined();
  });

  /**
   * A microtonal tonic is still a tonic to the ear, but the keyboard must show
   * it as bent or the user plays the wrong pitch for home. Sikah is the case.
   */
  it('shows a half-flat tonic as microtonal rather than as an untouched home key', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const tunings = buildKeyTunings(sikah, deriveDetuneMatrix(sikah.scaleDegrees).matrix);
    expect(tunings[4].role).toBe('microtonal');
    expect(tunings[4].label).toBe('E½♭');
  });

  /**
   * ...and it must ALSO still read as home. When `role` carried both facts the
   * retuned tier won, so Sikah — the maqam that exists to demonstrate a
   * microtonal tonic — rendered with no home key anywhere on the board.
   */
  it('still marks a microtonal tonic as home', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const tunings = buildKeyTunings(sikah, deriveDetuneMatrix(sikah.scaleDegrees).matrix);
    expect(tunings[4].isTonic).toBe(true);
    expect(tunings[4].ariaLabel).toBe('E half-flat, tuned −50c, home note');
  });

  it('marks exactly one key as home in every preset', () => {
    for (const preset of MAQAM_PRESETS) {
      const tunings = buildKeyTunings(preset, deriveDetuneMatrix(preset.scaleDegrees).matrix);
      expect(tunings.filter((t) => t.isTonic), preset.id).toHaveLength(1);
    }
  });

  it('keeps home on the tonic when the user retunes an unrelated key', () => {
    const tunings = buildKeyTunings(rast, toggleDetuneSlot(rastMatrix, 9));
    expect(tunings[0].isTonic).toBe(true);
    expect(tunings[9].isTonic).toBe(false);
  });

  it('marks no key as home when no maqam is loaded', () => {
    const tunings = buildKeyTunings(undefined, [...NEUTRAL_DETUNE_MATRIX]);
    expect(tunings.some((t) => t.isTonic)).toBe(false);
  });

  it('gives Hijaz a tonic and six plain scale keys, with nothing bent', () => {
    const hijaz = MAQAM_PRESETS_BY_ID.hijaz_d;
    const tunings = buildKeyTunings(hijaz, deriveDetuneMatrix(hijaz.scaleDegrees).matrix);
    expect(tunings.filter((t) => t.role === 'microtonal')).toHaveLength(0);
    expect(tunings.filter((t) => t.role === 'tonic')).toHaveLength(1);
    expect(tunings.filter((t) => t.role === 'scale')).toHaveLength(6);
  });

  /**
   * Colour must follow what will sound, not what the preset asked for. Once the
   * user bends a key by hand, the keyboard has to agree with the audio.
   */
  it('colours from the live matrix, not the preset, once they disagree', () => {
    const edited = toggleDetuneSlot(rastMatrix, 9); // bend A, which Rast leaves alone
    const tunings = buildKeyTunings(rast, edited);
    expect(tunings[9].role).toBe('microtonal');
    expect(tunings[9].cents).toBe(-50);
    expect(tunings[9].label).toBe('A'); // still spelled by the maqam
  });

  it('names a bent key the maqam does not use by its piano key and bend', () => {
    const tunings = buildKeyTunings(rast, toggleDetuneSlot(rastMatrix, 6)); // F#
    expect(tunings[6].role).toBe('microtonal');
    expect(tunings[6].label).toBe('F♯ −50c');
    expect(tunings[6].badge).toBe('−50c');
  });

  it('handles no preset at all', () => {
    const tunings = buildKeyTunings(undefined, [...NEUTRAL_DETUNE_MATRIX]);
    expect(tunings).toHaveLength(12);
    expect(tunings.every((t) => t.role === 'outside')).toBe(true);
  });

  /**
   * The visible keycap says "E½♭"; a speech engine reads that as "E one slash
   * two flat", or drops the glyph entirely. The spoken name must use words.
   */
  it('spells accidentals out in the spoken name, never as symbols', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[4].ariaLabel).toBe('E half-flat, tuned −50c');
    expect(tunings[4].label).toBe('E½♭');
    for (const tuning of tunings) {
      expect(tuning.ariaLabel, `pc ${tuning.pitchClass}`).not.toMatch(/[½¾♭♯♮]/);
    }
  });

  it('names the tonic as the home note', () => {
    expect(buildKeyTunings(rast, rastMatrix)[0].ariaLabel).toBe('C, home note');
  });

  it('gives every key a spoken description', () => {
    for (const preset of MAQAM_PRESETS) {
      const tunings = buildKeyTunings(preset, deriveDetuneMatrix(preset.scaleDegrees).matrix);
      for (const tuning of tunings) {
        expect(tuning.ariaLabel.length, `${preset.id} pc ${tuning.pitchClass}`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('spells the octave tonic from the maqam’s opening degree, not its close', () => {
    // Sikah opens on E-half-flat and closes on E-half-flat an octave up; the
    // keyboard must not end up spelling pitch class 4 from the closing degree.
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const tunings = buildKeyTunings(sikah, deriveDetuneMatrix(sikah.scaleDegrees).matrix);
    expect(tunings[4].label).toBe('E½♭');
  });
});

describe('matrixMatchesPreset', () => {
  it('is true for the preset’s own tuning', () => {
    for (const preset of MAQAM_PRESETS) {
      const matrix = deriveDetuneMatrix(preset.scaleDegrees).matrix;
      expect(matrixMatchesPreset(matrix, preset), preset.id).toBe(true);
    }
  });

  it('is false once a slot is bent', () => {
    expect(matrixMatchesPreset(toggleDetuneSlot(rastMatrix, 9), rast)).toBe(false);
  });

  /**
   * Derived, not remembered: bending a key and bending it back returns to
   * "Rast", because the answer is recomputed rather than latched by an edit.
   */
  it('returns to true when an edit is undone', () => {
    const there = toggleDetuneSlot(rastMatrix, 9);
    const andBack = toggleDetuneSlot(there, 9);
    expect(matrixMatchesPreset(andBack, rast)).toBe(true);
  });

  it('is false when a preset’s own bend is removed', () => {
    expect(matrixMatchesPreset(toggleDetuneSlot(rastMatrix, 4), rast)).toBe(false);
  });
});

describe('toggleDetuneSlot', () => {
  it('bends an unbent slot to a half-flat and back', () => {
    const bent = toggleDetuneSlot([...NEUTRAL_DETUNE_MATRIX], 4);
    expect(bent[4]).toBe(-50);
    expect(toggleDetuneSlot(bent, 4)[4]).toBe(0);
  });

  it('leaves the other eleven slots untouched', () => {
    const bent = toggleDetuneSlot([...NEUTRAL_DETUNE_MATRIX], 4);
    expect(bent.filter((c) => c !== 0)).toHaveLength(1);
  });

  it('does not mutate the matrix it is given', () => {
    const original = [...rastMatrix];
    toggleDetuneSlot(original, 9);
    expect(original).toEqual(rastMatrix);
  });
});

describe('bentPitchClasses', () => {
  it('lists Rast’s two bent keys', () => {
    expect(bentPitchClasses(rastMatrix)).toEqual([4, 11]);
  });

  it('is empty for Hijaz', () => {
    const hijaz = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.hijaz_d.scaleDegrees).matrix;
    expect(bentPitchClasses(hijaz)).toEqual([]);
  });
});

describe('formatCents', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(formatCents(-50)).toBe('−50c');
    expect(formatCents(50)).toBe('+50c');
    expect(formatCents(0)).toBe('0c');
  });
});
