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

  /**
   * The point of the rework: membership is binary. "In this maqam" now means
   * exactly one thing, rather than losing a colour fight to "tonic" or
   * "retuned" depending on the key.
   */
  it('reports membership as a single binary fact', () => {
    const roles = new Set(buildKeyTunings(rast, rastMatrix).map((t) => t.role));
    expect([...roles].sort()).toEqual(['in-scale', 'outside']);
  });

  it('marks Rast’s 7 pitch classes in-scale and the other 5 outside', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings.filter((t) => t.role === 'in-scale')).toHaveLength(7);
    expect(tunings.filter((t) => t.role === 'outside')).toHaveLength(5);
  });

  it('marks the tonic independently of membership', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[0].isTonic).toBe(true);
    expect(tunings[0].role).toBe('in-scale');
    expect(tunings[0].isRetuned).toBe(false);
  });

  it('marks retuning independently of membership', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    expect(tunings[4].isRetuned).toBe(true); // E half-flat
    expect(tunings[4].role).toBe('in-scale');
    expect(tunings[4].isTonic).toBe(false);
    expect(tunings[4].label).toBe('E½♭');
    expect(tunings[4].badge).toBe('½♭');
  });

  /**
   * Sikah is the case the old single-channel model could not express: its
   * tonic is E½♭, so one key is in the maqam AND home AND retuned. Every one
   * of those has to survive.
   */
  it('lets one key be in-scale, home and retuned at once', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const tunings = buildKeyTunings(sikah, deriveDetuneMatrix(sikah.scaleDegrees).matrix);
    expect(tunings[4].role).toBe('in-scale');
    expect(tunings[4].isTonic).toBe(true);
    expect(tunings[4].isRetuned).toBe(true);
    expect(tunings[4].label).toBe('E½♭');
  });

  it('marks nothing retuned in a maqam that stays in 12-TET', () => {
    const hijaz = MAQAM_PRESETS_BY_ID.hijaz_d;
    const tunings = buildKeyTunings(hijaz, deriveDetuneMatrix(hijaz.scaleDegrees).matrix);
    expect(tunings.filter((t) => t.isRetuned)).toHaveLength(0);
    expect(tunings.filter((t) => t.isTonic)).toHaveLength(1);
    expect(tunings.filter((t) => t.role === 'in-scale')).toHaveLength(7);
  });

  it('follows the live matrix, not the preset, once they disagree', () => {
    const edited = toggleDetuneSlot(rastMatrix, 9); // bend A, which Rast leaves alone
    const tunings = buildKeyTunings(rast, edited);
    expect(tunings[9].isRetuned).toBe(true);
    expect(tunings[9].cents).toBe(-50);
    // Membership is unchanged: A is still a degree of Rast, just bent.
    expect(tunings[9].role).toBe('in-scale');
    // The label follows the bend too, not just the colour.
    expect(tunings[9].label).toBe('A½♭');
  });

  /**
   * The direction that actually hurt, and that nothing covered.
   *
   * The old test only ADDED a bend, where a stale label is merely incomplete.
   * REMOVING a preset's own bend is the harmful case: the key sounded E natural
   * while still announcing itself as "E half-flat" to sighted and screen-reader
   * users alike — the app teaching a wrong interval off an authoritative-looking
   * screen. Class: `guardrail-coverage-gap`.
   */
  it('stops calling a key half-flat once the bend is removed', () => {
    const unbent = toggleDetuneSlot(rastMatrix, 4); // un-bend Rast's own E
    const tunings = buildKeyTunings(rast, unbent);
    expect(tunings[4].isRetuned).toBe(false);
    expect(tunings[4].cents).toBe(0);
    expect(tunings[4].label).toBe('E');
    expect(tunings[4].label).not.toBe('E½♭');
    expect(tunings[4].ariaLabel).toBe('E, in the maqam');
    expect(tunings[4].badge).toBeUndefined();
  });

  it('keeps the letter the maqam chose while the accidental follows the tuning', () => {
    // Bayati writes its sixth as B-flat. Bending that key must give a
    // three-quarter-flat B, never an A-something: the letter is the maqam's.
    const bayati = MAQAM_PRESETS_BY_ID.bayati_d;
    const bent = toggleDetuneSlot(deriveDetuneMatrix(bayati.scaleDegrees).matrix, 10);
    expect(buildKeyTunings(bayati, bent)[10].label).toBe('B¾♭');
  });

  it('can retune a key that is outside the maqam entirely', () => {
    const tunings = buildKeyTunings(rast, toggleDetuneSlot(rastMatrix, 6)); // F#
    expect(tunings[6].role).toBe('outside');
    expect(tunings[6].isRetuned).toBe(true);
    expect(tunings[6].label).toBe('F♯ 50 cents flat');
  });

  it('handles no preset at all', () => {
    const tunings = buildKeyTunings(undefined, [...NEUTRAL_DETUNE_MATRIX]);
    expect(tunings).toHaveLength(12);
    expect(tunings.every((t) => t.role === 'outside')).toBe(true);
    expect(tunings.every((t) => !t.isTonic && !t.isRetuned)).toBe(true);
  });

  /**
   * The spoken name is assembled from the same independent facts as the
   * visuals, so a screen reader hears what a sighted user sees rather than a
   * hierarchy of its own.
   */
  it('speaks every fact that is true of a key', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const tunings = buildKeyTunings(sikah, deriveDetuneMatrix(sikah.scaleDegrees).matrix);
    expect(tunings[4].ariaLabel).toBe(
      'E half-flat, in the maqam, home note, tuned 50 cents flat',
    );
  });

  it('speaks a plain scale key simply', () => {
    expect(buildKeyTunings(rast, rastMatrix)[2].ariaLabel).toBe('D, in the maqam');
  });

  it('speaks a key outside the maqam as outside it', () => {
    expect(buildKeyTunings(rast, rastMatrix)[1].ariaLabel).toBe('key, outside the maqam');
  });

  it('spells accidentals out in the spoken name, never as symbols', () => {
    for (const tuning of buildKeyTunings(rast, rastMatrix)) {
      expect(tuning.ariaLabel, `pc ${tuning.pitchClass}`).not.toMatch(/[½¾♭♯♮]/);
    }
  });

  it('marks exactly one key as home in every preset', () => {
    for (const preset of MAQAM_PRESETS) {
      const tunings = buildKeyTunings(preset, deriveDetuneMatrix(preset.scaleDegrees).matrix);
      expect(tunings.filter((t) => t.isTonic), preset.id).toHaveLength(1);
    }
  });

  it('gives every key a spoken description', () => {
    for (const preset of MAQAM_PRESETS) {
      const tunings = buildKeyTunings(preset, deriveDetuneMatrix(preset.scaleDegrees).matrix);
      for (const tuning of tunings) {
        expect(tuning.ariaLabel.length, `${preset.id} pc ${tuning.pitchClass}`).toBeGreaterThan(0);
      }
    }
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
    // Spoken as well as shown: "minus fifty c" was neither a unit nor English.
    expect(formatCents(-50)).toBe('50 cents flat');
    expect(formatCents(50)).toBe('50 cents sharp');
    expect(formatCents(0)).toBe('in equal temperament');
  });
});
