import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MELODY_ID,
  GENERATED_BEATS,
  MELODY_PATTERNS,
  durationForBeats,
  findMelodyDefinition,
  generateMelody,
  melodyBeats,
  resolveMelody,
} from './maqamMelody';
import {
  MAQAM_PRESETS,
  MAQAM_PRESETS_BY_ID,
  NEUTRAL_DETUNE_MATRIX,
  deriveDetuneMatrix,
} from '../data/maqamPresets';
import { detuneForMidiNote, midiNoteToFrequency } from '../audio/maqamSynth';
import { pitchClassOf, spellingLabel } from '../notation/maqamAccidentals';

const rast = MAQAM_PRESETS_BY_ID.rast_c;
const saba = MAQAM_PRESETS_BY_ID.saba_d;
const rastMatrix = deriveDetuneMatrix(rast.scaleDegrees).matrix;

const everyPatternAndPreset = MELODY_PATTERNS.flatMap((pattern) =>
  MAQAM_PRESETS.map((preset) => [`${pattern.id} / ${preset.id}`, pattern, preset] as const),
);

describe('melody patterns', () => {
  it('ships the default', () => {
    expect(findMelodyDefinition(DEFAULT_MELODY_ID)).toBeDefined();
  });

  it('returns undefined for an unknown id rather than a silent fallback', () => {
    expect(findMelodyDefinition('nope')).toBeUndefined();
  });

  it('gives every pattern a unique id', () => {
    const ids = MELODY_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The invariant that makes "write the pattern once, play it in 9 maqamat"
   * safe: a pattern may only ever reference a degree the loaded maqam has.
   * An off-by-one reaching past the end would resolve to nothing and the
   * melody would silently lose a note.
   */
  it.each(everyPatternAndPreset)('%s only uses degrees the maqam has', (_label, pattern, preset) => {
    const notes = pattern.build(preset);
    expect(notes.length).toBeGreaterThan(0);
    for (const item of notes) {
      expect(item.degree, `${pattern.id} on ${preset.id}`).toBeGreaterThanOrEqual(0);
      expect(item.degree).toBeLessThan(preset.scaleDegrees.length);
      expect(item.beats).toBeGreaterThan(0);
    }
  });

  it.each(everyPatternAndPreset)('%s resolves every note', (_label, pattern, preset) => {
    const notes = pattern.build(preset);
    // `resolveMelody` drops degrees it cannot resolve, so a shortfall here means
    // a pattern pointed somewhere the maqam does not go.
    expect(resolveMelody(preset, notes, 4, deriveDetuneMatrix(preset.scaleDegrees).matrix)).toHaveLength(notes.length);
  });

  it.each(everyPatternAndPreset)('%s starts on the tonic', (_label, pattern, preset) => {
    // Every pattern is a study of this maqam, so it opens on home — except the
    // descending scale and qafla, which arrive there instead.
    const notes = pattern.build(preset);
    const opensOrClosesOnTonic = notes[0].degree === 0 || notes[notes.length - 1].degree === 0;
    expect(opensOrClosesOnTonic, pattern.id).toBe(true);
  });

  it('works on Saba, which has 7 degrees rather than 8', () => {
    expect(saba.scaleDegrees).toHaveLength(7);
    for (const pattern of MELODY_PATTERNS) {
      const notes = pattern.build(saba);
      expect(notes.length, pattern.id).toBeGreaterThan(0);
      for (const item of notes) expect(item.degree).toBeLessThan(7);
    }
  });

  it('plays the scale pattern as the plain ascending scale', () => {
    const notes = findMelodyDefinition('scale-up')!.build(rast);
    expect(notes.map((n) => n.degree)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('plays the descending pattern backwards, ending long', () => {
    const notes = findMelodyDefinition('scale-down')!.build(rast);
    expect(notes.map((n) => n.degree)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(notes[notes.length - 1].beats).toBe(2);
  });

  it('pairs each degree with the one 2 above it in thirds', () => {
    const notes = findMelodyDefinition('thirds')!.build(rast);
    for (let i = 0; i + 1 < notes.length; i += 2) {
      expect(notes[i + 1].degree - notes[i].degree).toBe(2);
    }
  });

  it('meets on the ghammaz in the jins pattern', () => {
    // Rast's lower jins is 4 notes, so the cells share degree 3 (G).
    const notes = findMelodyDefinition('jins-by-jins')!.build(rast);
    const degrees = notes.map((n) => n.degree);
    expect(degrees.filter((d) => d === 3)).toHaveLength(2);
  });
});

describe('generateMelody', () => {
  it('is reproducible from its seed', () => {
    expect(generateMelody(rast, 42)).toEqual(generateMelody(rast, 42));
  });

  it('gives different phrases for different seeds', () => {
    expect(generateMelody(rast, 1)).not.toEqual(generateMelody(rast, 2));
  });

  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    'fills exactly 2 bars in %s',
    (_id, preset) => {
      for (let seed = 1; seed <= 25; seed += 1) {
        expect(melodyBeats(generateMelody(preset, seed)), `seed ${seed}`).toBeCloseTo(
          GENERATED_BEATS,
          6,
        );
      }
    },
  );

  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    'stays inside %s and resolves to the tonic',
    (_id, preset) => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const notes = generateMelody(preset, seed);
        expect(notes[notes.length - 1].degree, `seed ${seed}`).toBe(0);
        for (const item of notes) {
          expect(item.degree).toBeGreaterThanOrEqual(0);
          expect(item.degree).toBeLessThan(preset.scaleDegrees.length);
        }
      }
    },
  );

  /**
   * Conjunct motion is what makes it sound like a maqam rather than a random
   * walk. Not every interval — the generator allows thirds and a leap to the
   * ghammaz — but the bulk of them.
   */
  it('moves mostly by step', () => {
    let steps = 0;
    let total = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const notes = generateMelody(rast, seed);
      for (let i = 1; i < notes.length; i += 1) {
        total += 1;
        if (Math.abs(notes[i].degree - notes[i - 1].degree) <= 1) steps += 1;
      }
    }
    expect(steps / total).toBeGreaterThan(0.5);
  });

  it('survives a zero seed rather than dividing by it', () => {
    expect(() => generateMelody(rast, 0)).not.toThrow();
    expect(melodyBeats(generateMelody(rast, 0))).toBeCloseTo(GENERATED_BEATS, 6);
  });
});

describe('resolveMelody', () => {
  it('spells Rast’s third as the half-flat the maqam writes', () => {
    const resolved = resolveMelody(rast, [{ degree: 2, beats: 1 }], 4, rastMatrix);
    expect(spellingLabel(resolved[0].staff)).toBe('E½♭');
    expect(resolved[0].cents).toBe(-50);
    expect(resolved[0].midiNote).toBe(64);
  });

  /**
   * The end-to-end check: a melody note must sound at the pitch it is written
   * at, through the same detune matrix the keyboard uses. This is the app's
   * core invariant, asserted on the playback path rather than only the scale.
   */
  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    'sounds every %s melody note at its written pitch',
    (_id, preset) => {
      const { matrix } = deriveDetuneMatrix(preset.scaleDegrees);
      for (const pattern of MELODY_PATTERNS) {
        for (const item of resolveMelody(preset, pattern.build(preset), 4, matrix)) {
          const written = midiNoteToFrequency(item.midiNote, item.cents);
          const sounded = midiNoteToFrequency(
            item.midiNote,
            detuneForMidiNote(item.midiNote, matrix),
          );
          expect(Math.abs(sounded - written) / written).toBeLessThan(1e-9);
        }
      }
    },
  );

  /**
   * The regression this argument exists for.
   *
   * `resolveMelody` used to take the bend from the preset's spelling while the
   * keyboard took it from the live matrix, so editing the tuning made Play and
   * the keys disagree about the pitch of one written note — and the staff kept
   * announcing the preset's. The old test could not catch it: it built the
   * matrix from the same preset it was checking, so both sides always agreed.
   */
  it('follows the live matrix when it contradicts the preset spelling', () => {
    const neutral = [...NEUTRAL_DETUNE_MATRIX];
    const [third] = resolveMelody(rast, [{ degree: 2, beats: 1 }], 4, neutral);

    // Rast writes its third as E half-flat, but this tuning bends nothing.
    expect(third.cents).toBe(0);
    expect(spellingLabel(third.staff)).toBe('E');
    expect(third.midiNote).toBe(64);
  });

  it('re-bends the staff when a key outside the preset is bent by hand', () => {
    // A is unbent in Rast; bending it must change what the staff draws.
    const bentA = [...deriveDetuneMatrix(rast.scaleDegrees).matrix];
    bentA[9] = -50;
    const [sixth] = resolveMelody(rast, [{ degree: 5, beats: 1 }], 4, bentA);
    expect(sixth.cents).toBe(-50);
    expect(spellingLabel(sixth.staff)).toBe('A½♭');
  });

  it('keeps each note on the key its spelling names', () => {
    for (const item of resolveMelody(rast, findMelodyDefinition('scale-up')!.build(rast), 4, rastMatrix)) {
      expect(item.midiNote % 12).toBe(pitchClassOf(item.staff));
    }
  });

  it('drops nothing for a melody it can resolve, and does not invent notes', () => {
    const notes = [{ degree: 0, beats: 1 }, { degree: 99, beats: 1 }];
    // Out-of-range degrees are skipped rather than clamped onto a wrong pitch —
    // a wrong note is worse than a missing one, and the pattern tests above
    // guarantee shipped patterns never produce them.
    expect(resolveMelody(rast, notes, 4, rastMatrix)).toHaveLength(1);
  });
});

describe('durationForBeats', () => {
  it.each([
    [4, 'w'],
    [2, 'h'],
    [1, 'q'],
    [0.5, '8'],
    [0.25, '16'],
  ])('maps %p beats to %s', (beats, code) => {
    expect(durationForBeats(beats)).toBe(code);
  });
});
