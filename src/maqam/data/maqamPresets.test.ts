import { describe, expect, it } from 'vitest';

import {
  MAQAM_PRESETS,
  MAQAM_PRESETS_BY_ID,
  DEFAULT_MAQAM_ID,
  ajnasJoin,
  ajnasJoins,
  ajnasSpans,
  degreeAbsoluteCents,
  ghammazDegreeIndex,
  deriveDetuneMatrix,
  findMaqamPreset,
  hasMicrotones,
  scaleDegreeLabels,
  scalePitchClasses,
  type Jins,
  type MaqamPreset,
} from './maqamPresets';
import { pitchClassOf, spellingLabel } from '../notation/maqamAccidentals';

const TONIC_OCTAVE = 4;

describe('preset integrity', () => {
  it('ships each family head plus its members, with unique ids', () => {
    const ids = MAQAM_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      /*
       * Grouped by family, in maqamworld's own order within each. The
       * catalogue is assembled from one file per family, so this list reads
       * the way the picker does.
       *
       * Maqam Dalanshin is the one Rast-family member missing, on purpose —
       * see the note at the top of `families/rastFamily.ts`.
       */
      'rast_c',
      'suznak_c',
      'nairuz_c',
      'yakah_g',
      'kirdan_c',
      'sazkar_c',
      'mahur_c',
      'suzdalara_c',

      'bayati_d',
      'bayati_shuri_d',
      'muhayyar_d',
      'sikah_e',
      'saba_d',
      'hijaz_d',
      'kurd_d',
      'nahawand_c',
      'nikriz_c',
      'ajam_c',
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
    expect(micro).toEqual([
      // Every Rast-family member inherits Jins Rast's half-flat 3rd, so the
      // whole family is microtonal however plain its upper cell is.
      'rast_c',
      'suznak_c',
      'nairuz_c',
      'yakah_g',
      'kirdan_c',
      'sazkar_c',
      'mahur_c',
      'suzdalara_c',

      'bayati_d',
      'bayati_shuri_d',
      'muhayyar_d',
      'sikah_e',
      'saba_d',
    ]);
    expect(plain).toEqual(['hijaz_d', 'kurd_d', 'nahawand_c', 'nikriz_c', 'ajam_c']);
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

/**
 * "Jins Nahawand on G" -> "Jins Nahawand". The catalogue names a cell by where
 * it is rooted, which is useful on screen and in the way when comparing a cell
 * to itself. Apostrophes are normalised because 'Ajam is written with a
 * right single quote in the data and a straight one in most sources.
 */
function baseJinsName(name: string): string {
  return name
    .replace(/\s+on\s+.+$/, '')
    .replace(/['\u2018\u2019]/g, '\u02BC')
    .trim();
}

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

    /*
     * A jins may extend past the written octave, and that is not an error.
     *
     * Jins Nahawand is five notes; rooted on the 5th degree of Nikriz its top
     * note is the 9th, while the scale is written C to C. So the walk covers
     * the degrees the scale actually has and stops — but ONLY there. A jins
     * that runs short anywhere else is the tetrachord-for-pentachord bug, and
     * this is what used to catch it.
     */
    const rootCents = degreeAbsoluteCents(preset.scaleDegrees[rootIndex], TONIC_OCTAVE);
    const available = preset.scaleDegrees.length - rootIndex;
    const walked = jins.intervalsInCents.slice(0, available).map((_, step) => {
      const degree = preset.scaleDegrees[rootIndex + step];
      return degreeAbsoluteCents(degree, TONIC_OCTAVE) - rootCents;
    });

    expect(walked).toEqual(jins.intervalsInCents.slice(0, available));
    expect(
      available,
      `${jins.name} is cut off inside ${preset.name}, not at the end of it`,
    ).toBeGreaterThanOrEqual(Math.min(jins.intervalsInCents.length, preset.scaleDegrees.length - rootIndex));
  });

  /**
   * The size of a jins is a property of the JINS, not of the maqam quoting it.
   *
   * Jins Nahawand was stored as five notes in Bayati, Bayati Shuri, Hijaz and
   * Nahawand, and as four in Kurd and Nikriz. Both spellings looked plausible
   * in isolation; the disagreement is what makes the error visible, and no
   * test could see it because every check ran on one maqam at a time. Kurd's
   * upper bracket stopped a note short of the octave for as long as that
   * lasted.
   *
   * Compares by NAME — "Jins Nahawand on G" is the same cell wherever it is
   * quoted — so a new maqam that disagrees with the catalogue fails on the way
   * in rather than after someone notices a short bracket.
   */
  it('gives the same jins the same intervals everywhere it appears', () => {
    const byName = new Map<string, { id: string; intervals: number[] }[]>();
    for (const preset of MAQAM_PRESETS) {
      for (const jins of preset.primaryAjnas) {
        const seen = byName.get(jins.name) ?? [];
        seen.push({ id: jins.id, intervals: jins.intervalsInCents });
        byName.set(jins.name, seen);
      }
    }
    for (const [name, uses] of byName) {
      const spellings = new Set(uses.map((use) => use.intervals.join('-')));
      expect(
        [...spellings],
        `${name} is spelled ${spellings.size} different ways: ${uses
          .map((use) => `${use.id} = ${use.intervals.join('·')}`)
          .join(', ')}`,
      ).toHaveLength(1);
    }
  });

  /**
   * And the sizes themselves, against the source rather than against ourselves.
   *
   * Internal agreement cannot catch a cell that is wrong the same way in every
   * copy, which is exactly how Jins Rast shipped as a tetrachord in all nine
   * maqamat that quote it. These counts are quoted from maqamworld's own jins
   * index, which groups every jins under a "3-note", "4-note" or "5-note"
   * heading.
   */
  it.each([
    ['Jins Sikah', 3],
    ['Jins Bayati', 4],
    ['Jins Hijaz', 4],
    ['Jins Kurd', 4],
    ['Jins Upper Rast', 4],
    ['Jins Upper ʼAjam', 4],
    ['Jins ʼAjam', 5],
    ['Jins Nahawand', 5],
    ['Jins Nikriz', 5],
    ['Jins Rast', 5],
    ['Jins Sazkar', 5],
  ])('stores %s as a %i-note jins, as maqamworld does', (name, notes) => {
    const uses = MAQAM_PRESETS.flatMap((preset) =>
      preset.primaryAjnas.filter((jins) => baseJinsName(jins.name) === name),
    );
    /* A name that matches nothing would pass every assertion below it. */
    expect(uses.length, `nothing in the catalogue is called ${name}`).toBeGreaterThan(0);
    for (const jins of uses) {
      expect(jins.intervalsInCents.length, `${jins.id} (${jins.name})`).toBe(notes);
    }
  });

  /**
   * The step the per-jins check above could not take.
   *
   * It verified each cell against the scale in isolation, so it stayed green
   * while the panel told every maqam "Joined on G, where the first cell ends
   * and the second begins" and the melody generator guessed the ghammaz from
   * the lower cell's note count. Both are only true when the cells are
   * conjunct. Rast, Nahawand and Ajam are not, and all three shipped wrong.
   *
   * This asserts the RELATIONSHIP: where the lower cell ends, where the upper
   * one is rooted, and that the ghammaz is the upper root rather than a guess.
   */
  it.each(MAQAM_PRESETS.map((preset): [string, MaqamPreset] => [preset.id, preset]))(
    '%s joins its ajnas where the intervals say it does',
    (_id, preset) => {
      const labels = scaleDegreeLabels(preset.scaleDegrees);
      const join = ajnasJoin(preset);
      const lowerCellLength = preset.primaryAjnas[0].intervalsInCents.length;

      if (preset.primaryAjnas.length < 2) {
        expect(join, `${preset.id} has one jins and cannot have a join`).toBeUndefined();
        // Its phrases still need somewhere to rest: the top of the only cell.
        expect(ghammazDegreeIndex(preset)).toBe(lowerCellLength - 1);
        return;
      }

      expect(join, `${preset.id} has 2 ajnas, so it must have a join`).toBeDefined();
      const { lowerTopIndex, ghammazIndex, shared } = join!;

      // The ghammaz IS the upper cell's root, never an arithmetic guess.
      const upperRoot = preset.scaleDegrees.findIndex(
        (degree) =>
          degree.letter === preset.primaryAjnas[1].root.letter &&
          degree.accidental === preset.primaryAjnas[1].root.accidental,
      );
      expect(ghammazIndex).toBe(upperRoot);
      expect(ghammazDegreeIndex(preset)).toBe(upperRoot);

      // The lower cell ends where its own interval list runs out.
      expect(lowerTopIndex).toBe(lowerCellLength - 1);

      // `shared` must describe the scale, not an assumption about it.
      expect(
        shared,
        `${preset.id}: lower cell ends on ${labels[lowerTopIndex]}, upper roots on ${labels[ghammazIndex]}`,
      ).toBe(lowerTopIndex === ghammazIndex);

      // The upper cell never starts below the lower cell's last note, and never
      // leaves a gap wider than one scale step.
      expect(ghammazIndex).toBeGreaterThanOrEqual(lowerTopIndex);
      expect(ghammazIndex - lowerTopIndex).toBeLessThanOrEqual(1);
    },
  );

  /**
   * Every maqam here is conjunct: its cells meet on one shared degree.
   *
   * This test previously pinned rast_c, nahawand_c and ajam as DISJUNCT,
   * which was an artefact of wrong data rather than a fact about the music.
   * Each of those three has a 5-note pentachord as its root jins — Jins Rast,
   * Jins Nahawand and Jins 'Ajam are all "5-note jins" per maqamworld.com,
   * with the ghammaz on the 5th — and all three were authored here as 4-note
   * tetrachords stopping on the 4th. That made the lower cell end one degree
   * short, so it no longer reached the upper cell's root and the derivation
   * correctly reported cells that do not touch, from data that was wrong.
   *
   * The lesson survives and is worth keeping: the join is DERIVED, so
   * correcting the cell sizes corrected the panel, the ghammaz, the melody
   * patterns and this list together, with no prose to chase. The failure was
   * treating the repo's own data as ground truth for a claim about the world.
   */
  /**
   * A maqam is not limited to two cells — maqamworld draws three over Maqam
   * Rast, the third covering the descending form. The join logic used to read
   * `primaryAjnas[0]` and `[1]` and ignore the rest, so a third cell would be
   * stored, listed in the panel, and left out of every sentence about how the
   * cells meet. Built from a synthetic 3-cell preset, because none of the
   * shipped maqamat has one yet and a guard that waits for real data to appear
   * is a guard that is not running.
   */
  it('describes every seam, not just the first', () => {
    const rast = MAQAM_PRESETS_BY_ID.rast_c;
    const threeCells: MaqamPreset = {
      ...rast,
      primaryAjnas: [
        ...rast.primaryAjnas,
        {
          id: 'synthetic__third',
          name: 'Jins Nahawand on C',
          // Rooted on the upper tonic, closing the scale.
          root: { letter: 'C', accidental: 'n' },
          intervalsInCents: [0],
          source: 'https://www.maqamworld.com/en/jins/nahawand.php',
        },
      ],
    };

    expect(ajnasJoins(rast)).toHaveLength(1);
    expect(ajnasJoins(threeCells)).toHaveLength(2);
    // And the maqam's own ghammaz is still the first seam.
    expect(ajnasJoin(threeCells)).toEqual(ajnasJoins(threeCells)[0]);
  });

  it('has no disjunct maqamat, because every cell reaches its ghammaz', () => {
    const disjunct = MAQAM_PRESETS.filter((preset) => ajnasJoin(preset)?.shared === false)
      .map((preset) => preset.id)
      .sort();
    expect(disjunct).toEqual([]);
  });

  /** Every jins cites where its size and intervals were checked. */
  it('sources every musical claim', () => {
    for (const preset of MAQAM_PRESETS) {
      for (const jins of preset.primaryAjnas) {
        expect(jins.source, `${jins.id} has no source`).toMatch(/^https:\/\//);
      }
    }
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

/**
 * Every shipped maqam, spelled out. The one place a reader can check the
 * app's musical claims against a reference without running it.
 */
const SCALE_READBACK: [string, string][] = [
  ['rast_c', 'C D E½♭ F G A B½♭ C'],
  ['bayati_d', 'D E½♭ F G A B♭ C D'],
  // Bayati's family: same Jins Bayati below, a different cell on the 4th.
  ['bayati_shuri_d', 'D E½♭ F G A♭ B C D'],
  ['muhayyar_d', 'D E½♭ F G A B½♭ C D'],
  ['sikah_e', 'E½♭ F G A B½♭ C D E½♭'],
  ['saba_d', 'D E½♭ F G♭ A B♭ C'],
  ['hijaz_d', 'D E♭ F♯ G A B♭ C D'],
  ['kurd_d', 'D E♭ F G A B♭ C D'],
  ['nahawand_c', 'C D E♭ F G A♭ B♭ C'],
  ['nikriz_c', 'C D E♭ F♯ G A B♭ C'],
  ['ajam_c', 'C D E F G A B C'],

  /*
   * Maqam Rast family. Authored here from maqamworld's prose — "starts with
   * the root Jins Rast on the tonic, followed by X on the Nth degree" — and
   * independently of the catalogue, which is the point of this table.
   */
  ['suznak_c', 'C D E½♭ F G A♭ B C'],
  ['nairuz_c', 'C D E½♭ F G A½♭ B♭ C'],
  // The same two cells as Nairuz, a fourth lower.
  ['yakah_g', 'G A B½♭ C D E½♭ F G'],
  // Identical to Rast by design: Kirdan differs in sayr, which is not a scale.
  ['kirdan_c', 'C D E½♭ F G A B½♭ C'],
  // The raised 2nd is the whole of Sazkar, and the only interval in this
  // family read off a notation image rather than out of prose.
  ['sazkar_c', 'C D♯ E½♭ F G A B½♭ C'],
  ['mahur_c', 'C D E½♭ F G A B C'],
  ['suzdalara_c', 'C D E½♭ F G A B♭ C'],
];

describe('written scales read back as expected', () => {
  /**
   * Every maqam spelled out. This is the one place a reader can check the
   * app's musical claims against a reference without running it, so every
   * shipped maqam belongs here, not a sample. The test below fails if one is
   * added without a row.
   */
  it.each(SCALE_READBACK)('%s', (id, expected) => {
    expect(scaleDegreeLabels(MAQAM_PRESETS_BY_ID[id].scaleDegrees).join(' ')).toBe(expected);
  });

  it('covers every shipped maqam, by id rather than by count', () => {
    /*
     * The previous version asserted `MAQAM_PRESETS.toHaveLength(9)` as a stand
     * in for "the table covers everything". That is a proxy: it fails when a
     * maqam is added even if the row WAS added, and it would pass with a row
     * for a maqam that does not exist. Compare the sets.
     */
    expect([...SCALE_READBACK.map(([id]) => id)].sort()).toEqual(
      MAQAM_PRESETS.map((preset) => preset.id).sort(),
    );
  });
});

describe('scale spellings', () => {
  it('puts Sikah on a tonic no untouched piano key can play', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    const { matrix } = deriveDetuneMatrix(sikah.scaleDegrees);
    expect(matrix[pitchClassOf(sikah.tonic)]).toBe(-50);
  });
});

describe('ajnasSpans', () => {
  /**
   * What the brackets over the staff are drawn from. Derived from each cell's
   * root and its own interval count, so a cell corrected from a tetrachord to
   * a pentachord — which is the correction this whole dataset needed once —
   * moves its bracket with no second number to remember.
   */
  it('covers every cell, ending each one on its own top note', () => {
    for (const preset of MAQAM_PRESETS) {
      for (const span of ajnasSpans(preset)) {
        const jins = preset.primaryAjnas.find((cell) => cell.id === span.id);
        expect(jins, `${preset.id} has no cell ${span.id}`).toBeDefined();
        expect(span.toIndex - span.fromIndex + 1, `${preset.id} / ${span.id}`).toBe(
          Math.min(jins!.intervalsInCents.length, preset.scaleDegrees.length - span.fromIndex),
        );
        expect(span.toIndex).toBeLessThan(preset.scaleDegrees.length);
      }
    }
  });

  it('meets the ghammaz exactly where the join says it does', () => {
    for (const preset of MAQAM_PRESETS) {
      const spans = ajnasSpans(preset);
      ajnasJoins(preset).forEach((join, index) => {
        const lower = spans[index];
        const upper = spans[index + 1];
        if (!lower || !upper) return;
        expect(lower.toIndex, `${preset.id} lower cell`).toBe(join.lowerTopIndex);
        expect(upper.fromIndex, `${preset.id} upper cell`).toBe(join.ghammazIndex);
      });
    }
  });

  /*
   * A cell rooted on a degree the scale does not contain must be left OUT, not
   * drawn from index 0. `findIndex` returns -1 there, and -1 reads as a
   * perfectly plausible bracket starting on the tonic.
   */
  it('drops a cell whose root is not a degree of this maqam', () => {
    const rast = MAQAM_PRESETS_BY_ID.rast_c;
    // F sharp is not a degree of Rast, so this cell has nowhere to sit.
    const orphan: Jins = {
      ...rast.primaryAjnas[0],
      id: 'not_in_this_scale',
      root: { letter: 'F', accidental: '#' },
    };
    const invented: MaqamPreset = {
      ...rast,
      primaryAjnas: [...rast.primaryAjnas, orphan],
    };
    expect(ajnasSpans(invented).map((span) => span.id)).toEqual(
      ajnasSpans(rast).map((span) => span.id),
    );
  });
});
