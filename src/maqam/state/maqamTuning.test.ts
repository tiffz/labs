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

  /**
   * The degree numeral is the whole membership design, so it has to be right
   * on the maqam that falsified the three models before it. On Rast every
   * white key is in the maqam, which is exactly why a relative tint said
   * nothing there.
   */
  it('numbers every degree from the tonic, and numbers nothing else', () => {
    const tunings = buildKeyTunings(rast, rastMatrix);
    // C D E½♭ F G A B½♭, in pitch-class order.
    expect(tunings.filter((t) => t.degree !== undefined).map((t) => t.degree)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(tunings[0].degree).toBe(1);
    expect(tunings[0].isTonic).toBe(true);
    // The closing upper tonic is the same pitch class as the opening one. It
    // must not renumber home as 8.
    expect(rast.scaleDegrees).toHaveLength(8);
    expect(tunings.filter((t) => t.degree === 8)).toHaveLength(0);
    // Nothing outside the maqam is numbered.
    expect(tunings.filter((t) => t.role === 'outside' && t.degree !== undefined)).toHaveLength(0);
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
    expect(tunings[4].ariaLabel).toBe('E, degree 3 of the maqam');
  });

  it('keeps the letter the maqam chose while the accidental follows the tuning', () => {
    // Bayati writes its sixth as B-flat. Bending that key must give a
    // three-quarter-flat B, never an A-something: the letter is the maqam's.
    const bayati = MAQAM_PRESETS_BY_ID.bayati_d;
    const bent = toggleDetuneSlot(deriveDetuneMatrix(bayati.scaleDegrees).matrix, 10);
    expect(buildKeyTunings(bayati, bent)[10].label).toBe('B¾♭');
  });

  it('names a key bent outside the maqam as a note, not as a number', () => {
    /*
     * This asserted `'F\u266f \u221250'`, which is what the keycap actually
     * showed — and the keyboard appends the octave to whatever it is handed, so
     * the key read `B \u2212503` on a white key and nobody could parse it. The
     * test was pinning the bug.
     *
     * A bend is always exactly a quarter tone down. From a BLACK key that lands
     * a quarter tone above the natural below it, so F\u266f becomes F\u00bd\u266f.
     */
    const tunings = buildKeyTunings(rast, toggleDetuneSlot(rastMatrix, 6)); // F#
    expect(tunings[6].role).toBe('outside');
    expect(tunings[6].isRetuned).toBe(true);
    expect(tunings[6].label).toBe('F\u00bd\u266f');
    // The spoken form still carries the exact amount; only the keycap is compact.
    expect(tunings[6].ariaLabel).toBe('F♯, outside the maqam, tuned 50 cents flat');
  });

  it('names a bent WHITE key as its own half-flat', () => {
    /*
     * The reported case. Nahawand on C has no B natural, so bending B falls to
     * `bentLabel` rather than to the maqam's own spelling, and the keycap read
     * `B \u2212503`.
     */
    const nahawand = MAQAM_PRESETS_BY_ID.nahawand_c;
    const matrix = deriveDetuneMatrix(nahawand.scaleDegrees).matrix;
    const tunings = buildKeyTunings(nahawand, toggleDetuneSlot(matrix, 11)); // B
    expect(tunings[11].isRetuned).toBe(true);
    expect(tunings[11].label).toBe('B\u00bd\u266d');
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
      'E half-flat, degree 1 of the maqam, home note, tuned 50 cents flat',
    );
  });

  it('speaks a plain scale key simply', () => {
    expect(buildKeyTunings(rast, rastMatrix)[2].ariaLabel).toBe('D, degree 2 of the maqam');
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
  /**
   * Spoken, so it spells the unit out. It used to render "−50c", which a
   * screen reader says as "minus fifty c" — neither a unit nor English.
   */
  it('spells the unit and the direction', () => {
    expect(formatCents(-50)).toBe('50 cents flat');
    expect(formatCents(50)).toBe('50 cents sharp');
  });

  /**
   * Always a quantity, never a clause. Callers drop this inside a sentence, so
   * a zero that returned "in equal temperament" would read as "tuned in equal
   * temperament" — the `failure-as-valid-value` shape, in prose.
   */
  it('stays a quantity at zero', () => {
    expect(formatCents(0)).toBe('0 cents');
  });

  /**
   * The keycap is about 24px, and the KEYBOARD APPENDS THE OCTAVE to whatever
   * this returns — so the budget is the printed name plus a digit.
   *
   * This used to measure `badge`, a field nothing rendered, while `label` (the
   * string that actually reaches the key) went unchecked. A bent key's label
   * was `"B \u221250"`, five characters ending in a number, and with the octave
   * glued on it printed `B \u2212503`. The guard was pointed at the wrong
   * field, which is why it stayed green through the whole thing.
   *
   * Every bendable key, on a maqam that does not name it, so the bent branch is
   * the one under test.
   */
  it('keeps every bent key name short enough to fit a keycap', () => {
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      const label = buildKeyTunings(rast, toggleDetuneSlot(rastMatrix, pitchClass))[pitchClass]
        .label;
      expect(label, `pitch class ${pitchClass} has no name when bent`).toBeDefined();
      expect(
        label!.length,
        `"${label}" is too long for a keycap once the octave is appended`,
      ).toBeLessThanOrEqual(4);
      expect(
        label!,
        `"${label}" ends in a digit, so appending the octave runs two numbers together`,
      ).not.toMatch(/\d$/);
    }
  });
});
