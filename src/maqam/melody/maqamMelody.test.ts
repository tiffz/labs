import { describe, expect, it } from 'vitest';

import { durationForBeats, resolveMelody, scaleOf } from './maqamMelody';
import {
  MAQAM_PRESETS,
  MAQAM_PRESETS_BY_ID,
  NEUTRAL_DETUNE_MATRIX,
  deriveDetuneMatrix,
} from '../data/maqamPresets';
import { detuneForMidiNote, midiNoteToFrequency } from '../audio/maqamSynth';
import { pitchClassOf, spellingLabel } from '../notation/maqamAccidentals';

const rast = MAQAM_PRESETS_BY_ID.rast_c;
const rastMatrix = deriveDetuneMatrix(rast.scaleDegrees).matrix;

/*
 * The drill patterns and the procedural generator used to live here, with
 * roughly 200 lines of tests. Both are gone: each made a claim about how this
 * music moves, and those claims belong to the sayr, which nobody here is in a
 * position to get right. What is left is the scale, which follows from the
 * data alone.
 */

describe('scaleOf', () => {
  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    'walks %s once, in order, with no gaps',
    (_id, preset) => {
      const degrees = scaleOf(preset).map((note) => note.degree);
      expect(degrees).toEqual(preset.scaleDegrees.map((_, index) => index));
    },
  );

  it('gives every note the same length, because a scale has no rhythm to claim', () => {
    expect(new Set(scaleOf(rast).map((note) => note.beats)).size).toBe(1);
  });

  it('covers Saba, which stops at the seventh', () => {
    const saba = MAQAM_PRESETS_BY_ID.saba_d;
    expect(saba.scaleDegrees).toHaveLength(7);
    expect(scaleOf(saba)).toHaveLength(7);
  });
});

describe('resolveMelody', () => {
  it('spells Rast\u2019s third as the half-flat the maqam writes', () => {
    const resolved = resolveMelody(rast, [{ degree: 2, beats: 1 }], 4, rastMatrix);
    expect(spellingLabel(resolved[0].staff)).toBe('E½♭');
    expect(resolved[0].cents).toBe(-50);
    expect(resolved[0].midiNote).toBe(64);
  });

  /**
   * The app's core invariant, asserted on the playback path: a note must sound
   * at the pitch it is written at, through the same matrix the keyboard uses.
   */
  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    'sounds every %s scale note at its written pitch',
    (_id, preset) => {
      const { matrix } = deriveDetuneMatrix(preset.scaleDegrees);
      for (const item of resolveMelody(preset, scaleOf(preset), 4, matrix)) {
        const written = midiNoteToFrequency(item.midiNote, item.cents);
        const sounded = midiNoteToFrequency(item.midiNote, detuneForMidiNote(item.midiNote, matrix));
        expect(Math.abs(sounded - written) / written).toBeLessThan(1e-9);
      }
    },
  );

  /**
   * The regression the matrix argument exists for. `resolveMelody` used to
   * take the bend from the preset's spelling while the keyboard took it from
   * the live matrix, so editing the tuning made Play and the keys disagree.
   */
  it('follows the live matrix when it contradicts the preset spelling', () => {
    const neutral = [...NEUTRAL_DETUNE_MATRIX];
    const [third] = resolveMelody(rast, [{ degree: 2, beats: 1 }], 4, neutral);
    expect(third.cents).toBe(0);
    expect(spellingLabel(third.staff)).toBe('E');
    expect(third.midiNote).toBe(64);
  });

  it('re-bends the staff when a key outside the preset is bent by hand', () => {
    const bentA = [...deriveDetuneMatrix(rast.scaleDegrees).matrix];
    bentA[9] = -50;
    const [sixth] = resolveMelody(rast, [{ degree: 5, beats: 1 }], 4, bentA);
    expect(sixth.cents).toBe(-50);
    expect(spellingLabel(sixth.staff)).toBe('A½♭');
  });

  it('keeps each note on the key its spelling names', () => {
    for (const item of resolveMelody(rast, scaleOf(rast), 4, rastMatrix)) {
      expect(item.midiNote % 12).toBe(pitchClassOf(item.staff));
    }
  });

  it('drops an out-of-range degree rather than clamping it onto a wrong pitch', () => {
    const notes = [
      { degree: 0, beats: 1 },
      { degree: 99, beats: 1 },
    ];
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
