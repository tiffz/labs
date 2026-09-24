import { describe, expect, it } from 'vitest';

import {
  MAQAM_PRESETS,
  MAQAM_PRESETS_BY_ID,
  DEFAULT_MAQAM_ID,
  degreeAbsoluteCents,
  deriveDetuneMatrix,
  findMaqamPreset,
  hasMicrotones,
  scaleDegreeLabels,
  scalePitchClasses,
  type MaqamPreset,
} from './maqamPresets';
import { pitchClassOf, spellingLabel } from '../notation/maqamAccidentals';

const TONIC_OCTAVE = 4;

describe('preset integrity', () => {
  it('ships the nine maqam families with unique ids', () => {
    const ids = MAQAM_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      'rast_c',
      'bayati_d',
      'sikah_e',
      'saba_d',
      'hijaz_d',
      'kurd_d',
      'nahawand_c',
      'nikriz_c',
      'ajam_bb',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The app exists to teach that maqam != quarter-tone. If every family were
   * microtonal a learner could not tell the two ideas apart, so the set
   * deliberately spans both.
   */
  it('covers both microtonal and 12-TET families', () => {
    const micro = MAQAM_PRESETS.filter((p) => hasMicrotones(p.scaleDegrees)).map((p) => p.id);
    const plain = MAQAM_PRESETS.filter((p) => !hasMicrotones(p.scaleDegrees)).map((p) => p.id);
    expect(micro).toEqual(['rast_c', 'bayati_d', 'sikah_e', 'saba_d']);
    expect(plain).toEqual(['hijaz_d', 'kurd_d', 'nahawand_c', 'nikriz_c', 'ajam_bb']);
  });

  it('resolves the default id', () => {
    expect(findMaqamPreset(DEFAULT_MAQAM_ID)).toBeDefined();
  });

  it('returns undefined for an unknown id rather than the default preset', () => {
    expect(findMaqamPreset('not_a_maqam')).toBeUndefined();
    expect(findMaqamPreset(null)).toBeUndefined();
    expect(findMaqamPreset('')).toBeUndefined();
  });

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s starts on its tonic',
    (_id, preset) => {
      const first = preset.scaleDegrees[0];
      expect(first.letter).toBe(preset.tonic.letter);
      expect(first.accidental).toBe(preset.tonic.accidental);
      expect(first.octaveOffset).toBe(0);
    },
  );

  it.each(MAQAM_PRESETS.filter((p) => p.repeatsAtOctave).map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s closes on its tonic an octave above',
    (_id, preset) => {
      const last = preset.scaleDegrees[preset.scaleDegrees.length - 1];
      expect(last.letter).toBe(preset.tonic.letter);
      expect(last.accidental).toBe(preset.tonic.accidental);
      expect(last.octaveOffset).toBe(1);
    },
  );

  /**
   * Saba is the reason `repeatsAtOctave` exists. Asserting it explicitly keeps
   * the flag honest: if someone "fixes" Saba by appending an upper D, this
   * fails rather than quietly making the maqam wrong.
   */
  it('keeps Saba open-ended, with no upper tonic', () => {
    const saba = MAQAM_PRESETS_BY_ID.saba_d;
    expect(saba.repeatsAtOctave).toBe(false);
    expect(saba.scaleDegrees).toHaveLength(7);
    const last = saba.scaleDegrees[saba.scaleDegrees.length - 1];
    expect(last.letter).not.toBe(saba.tonic.letter);
  });

  it('gives every other family an eight-degree scale', () => {
    for (const preset of MAQAM_PRESETS.filter((p) => p.repeatsAtOctave)) {
      expect(preset.scaleDegrees, preset.id).toHaveLength(8);
    }
  });

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s ascends strictly',
    (_id, preset) => {
      const cents = preset.scaleDegrees.map((d) => degreeAbsoluteCents(d, TONIC_OCTAVE));
      for (let i = 1; i < cents.length; i += 1) {
        expect(cents[i], `degree ${i} must be above degree ${i - 1}`).toBeGreaterThan(
          cents[i - 1],
        );
      }
    },
  );

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s stays within one octave of its tonic',
    (_id, preset) => {
      const cents = preset.scaleDegrees.map((d) => degreeAbsoluteCents(d, TONIC_OCTAVE));
      const span = cents[cents.length - 1] - cents[0];
      // Exactly an octave for the eight families that close; strictly under one
      // for Saba, which stops at its seventh. Both branches assert something
      // real — `span === span` would pass for any value and prove nothing.
      if (preset.repeatsAtOctave) {
        expect(span, 'should close exactly at the octave').toBe(1200);
      } else {
        expect(span, 'should stop short of the octave').toBeLessThan(1200);
      }
      expect(span).toBeGreaterThan(0);
    },
  );

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s names every degree on a distinct letter',
    (_id, preset) => {
      // A heptatonic scale uses each letter once, so the staff never stacks two
      // noteheads on one line. The closing upper tonic repeats the first letter.
      const letters = preset.scaleDegrees.slice(0, -1).map((d) => d.letter);
      expect(new Set(letters).size).toBe(letters.length);
    },
  );
});

describe('detune matrix derivation', () => {
  it('bends only the pitch classes the maqam writes as microtonal', () => {
    const rast = MAQAM_PRESETS_BY_ID.rast_c;
    const { matrix, conflicts } = deriveDetuneMatrix(rast.scaleDegrees);
    expect(conflicts).toEqual([]);
    // C D E F G A B -> only E (4) and B (11) are half-flat.
    expect(matrix).toEqual([0, 0, 0, 0, -50, 0, 0, 0, 0, 0, 0, -50]);
  });

  it('leaves Hijaz entirely in 12-TET', () => {
    const hijaz = MAQAM_PRESETS_BY_ID.hijaz_d;
    const { matrix, conflicts } = deriveDetuneMatrix(hijaz.scaleDegrees);
    expect(conflicts).toEqual([]);
    expect(matrix.every((cents) => cents === 0)).toBe(true);
    expect(hasMicrotones(hijaz.scaleDegrees)).toBe(false);
  });

  it('bends only E for Bayati, leaving its B-flat alone', () => {
    const { matrix } = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.bayati_d.scaleDegrees);
    expect(matrix[4]).toBe(-50); // E half-flat
    expect(matrix[10]).toBe(0); // B-flat is an ordinary black key
    expect(matrix[11]).toBe(0); // B natural is unused and unbent
  });

  it('reports a conflict instead of silently dropping a degree', () => {
    // A contrived maqam asking for E natural AND E half-flat: one piano key,
    // two pitches. The 12-key model cannot express it, and must say so.
    const { matrix, conflicts } = deriveDetuneMatrix([
      { letter: 'E', accidental: 'n', octaveOffset: 0 },
      { letter: 'E', accidental: 'd', octaveOffset: 0 },
    ]);
    expect(conflicts).toEqual([{ pitchClass: 4, cents: [-50, 0] }]);
    expect(matrix[4]).toBe(-50);
  });

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s maps onto a 12-key board without conflicts',
    (_id, preset) => {
      expect(deriveDetuneMatrix(preset.scaleDegrees).conflicts).toEqual([]);
    },
  );

  it.each(MAQAM_PRESETS.map((p): [string, MaqamPreset] => [p.id, p]))(
    '%s derives a 12-slot matrix within a semitone',
    (_id, preset) => {
      const { matrix } = deriveDetuneMatrix(preset.scaleDegrees);
      expect(matrix).toHaveLength(12);
      for (const cents of matrix) {
        expect(Math.abs(cents)).toBeLessThan(100);
      }
    },
  );

  it('marks seven distinct keys as in-scale for each heptatonic preset', () => {
    for (const preset of MAQAM_PRESETS) {
      expect(scalePitchClasses(preset.scaleDegrees).size, preset.id).toBe(7);
    }
  });
});

describe('ajnas agree with the scale they are drawn from', () => {
  /**
   * `intervalsInCents` and `scaleDegrees` are authored separately — two
   * independent statements of the same musical fact. Walking the scale from the
   * jins root must reproduce the authored intervals. This is what caught the
   * spec's Jins Nahawand being rooted on A, where Bayati's B-flat makes
   * 0-200-300-500 unplayable.
   */
  it.each(
    MAQAM_PRESETS.flatMap((preset) =>
      preset.primaryAjnas.map((jins): [string, MaqamPreset, typeof jins] => [
        jins.id,
        preset,
        jins,
      ]),
    ),
  )('%s', (_id, preset, jins) => {
    const rootIndex = preset.scaleDegrees.findIndex(
      (degree) =>
        degree.letter === jins.root.letter && degree.accidental === jins.root.accidental,
    );
    expect(
      rootIndex,
      `${jins.name} is rooted on ${spellingLabel(jins.root)}, which is not a degree of ${preset.name} (${scaleDegreeLabels(preset.scaleDegrees).join(' ')})`,
    ).toBeGreaterThanOrEqual(0);

    const rootCents = degreeAbsoluteCents(preset.scaleDegrees[rootIndex], TONIC_OCTAVE);
    const walked = jins.intervalsInCents.map((_, step) => {
      const degree = preset.scaleDegrees[rootIndex + step];
      expect(
        degree,
        `${jins.name} needs ${jins.intervalsInCents.length} degrees from ${spellingLabel(jins.root)}, but the scale runs out`,
      ).toBeDefined();
      return degreeAbsoluteCents(degree, TONIC_OCTAVE) - rootCents;
    });

    expect(walked).toEqual(jins.intervalsInCents);
  });

  it('starts every jins at its root', () => {
    for (const preset of MAQAM_PRESETS) {
      for (const jins of preset.primaryAjnas) {
        expect(jins.intervalsInCents[0], jins.id).toBe(0);
      }
    }
  });

  it('gives every jins three to five notes', () => {
    for (const preset of MAQAM_PRESETS) {
      for (const jins of preset.primaryAjnas) {
        expect(jins.intervalsInCents.length, jins.id).toBeGreaterThanOrEqual(3);
        expect(jins.intervalsInCents.length, jins.id).toBeLessThanOrEqual(5);
      }
    }
  });

  it('keeps jins ids unique across the whole catalogue', () => {
    const ids = MAQAM_PRESETS.flatMap((p) => p.primaryAjnas.map((j) => j.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('written scales read back as expected', () => {
  /**
   * Every family spelled out. This is the one place a reader can check the
   * app's musical claims against a reference without running it — so all nine
   * belong here, not a sample.
   */
  it.each([
    ['rast_c', 'C D E½♭ F G A B½♭ C'],
    ['bayati_d', 'D E½♭ F G A B♭ C D'],
    ['sikah_e', 'E½♭ F G A B½♭ C D E½♭'],
    ['saba_d', 'D E½♭ F G♭ A B♭ C'],
    ['hijaz_d', 'D E♭ F♯ G A B♭ C D'],
    ['kurd_d', 'D E♭ F G A B♭ C D'],
    ['nahawand_c', 'C D E♭ F G A♭ B♭ C'],
    ['nikriz_c', 'C D E♭ F♯ G A B♭ C'],
    ['ajam_bb', 'B♭ C D E♭ F G A B♭'],
  ])('%s', (id, expected) => {
    expect(scaleDegreeLabels(MAQAM_PRESETS_BY_ID[id].scaleDegrees).join(' ')).toBe(expected);
  });

  it('covers every shipped family in the readback table above', () => {
    // A table that silently stops covering new families is the `guardrail-
    // coverage-gap` shape: green, and blind to whatever was added last.
    expect(MAQAM_PRESETS).toHaveLength(9);
  });

  it('puts Sikah on a tonic no untouched piano key can play', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const { matrix } = deriveDetuneMatrix(sikah.scaleDegrees);
    expect(matrix[pitchClassOf(sikah.tonic)]).toBe(-50);
  });
});
