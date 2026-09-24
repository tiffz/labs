import { describe, expect, it } from 'vitest';

import {
  defaultSpellingFor,
  highlightedDegreeIndices,
  referenceStaffNotes,
} from './maqamSpelling';
import { MAQAM_PRESETS, MAQAM_PRESETS_BY_ID } from '../data/maqamPresets';
import { pitchClassOf, spellingLabel } from './maqamAccidentals';

const rast = MAQAM_PRESETS_BY_ID.rast_c;

const label = (note: { letter: string; accidental: string }) =>
  spellingLabel(note as Parameters<typeof spellingLabel>[0]);

describe('highlightedDegreeIndices', () => {
  it('lights nothing when no key is held', () => {
    expect(highlightedDegreeIndices(rast, new Set())).toEqual(new Set());
  });

  it('lights the degree whose pitch class is held', () => {
    // E4 = 64. Rast's third is E half-flat, degree index 2.
    expect(highlightedDegreeIndices(rast, new Set([64]))).toEqual(new Set([2]));
  });

  /**
   * One key is every octave of its pitch class on a 12-key board, so both the
   * lower and upper tonic light. Pretending otherwise would be inventing a
   * distinction the instrument cannot make.
   */
  it('lights both tonics when the tonic key is held', () => {
    // C4 = 60. Rast runs C .. C, degrees 0 and 7.
    expect(highlightedDegreeIndices(rast, new Set([60]))).toEqual(new Set([0, 7]));
  });

  it('matches by pitch class, so the octave of the held key does not matter', () => {
    expect(highlightedDegreeIndices(rast, new Set([72]))).toEqual(
      highlightedDegreeIndices(rast, new Set([60])),
    );
  });

  it('lights several degrees when several keys are held', () => {
    // C4 and G4 -> tonic (0, 7) and fifth (4).
    expect(highlightedDegreeIndices(rast, new Set([60, 67]))).toEqual(new Set([0, 4, 7]));
  });

  it('lights nothing for a key outside the maqam', () => {
    // F#4 = 66 is not in Rast.
    expect(highlightedDegreeIndices(rast, new Set([66]))).toEqual(new Set());
  });

  it('lights Sikah’s three E-half-flats from one key', () => {
    const sikah = MAQAM_PRESETS_BY_ID.sikah_e;
    // Sikah: E½♭ F G A B½♭ C D E½♭ — indices 0 and 7 are the same pitch class.
    expect(highlightedDegreeIndices(sikah, new Set([64]))).toEqual(new Set([0, 7]));
  });

  it('lights Saba’s single tonic — it has no upper one', () => {
    const saba = MAQAM_PRESETS_BY_ID.saba_d;
    expect(highlightedDegreeIndices(saba, new Set([62]))).toEqual(new Set([0]));
  });

  it('handles no maqam', () => {
    expect(highlightedDegreeIndices(undefined, new Set([60]))).toEqual(new Set());
  });

  it('never returns an index outside the scale', () => {
    for (const preset of MAQAM_PRESETS) {
      const all = new Set(Array.from({ length: 128 }, (_, i) => i));
      for (const index of highlightedDegreeIndices(preset, all)) {
        expect(index, preset.id).toBeGreaterThanOrEqual(0);
        expect(index, preset.id).toBeLessThan(preset.scaleDegrees.length);
      }
    }
  });
});

describe('defaultSpellingFor', () => {
  it('names the five black keys as flats', () => {
    expect([1, 3, 6, 8, 10].map((pc) => label(defaultSpellingFor(pc)))).toEqual([
      'D♭',
      'E♭',
      'G♭',
      'A♭',
      'B♭',
    ]);
  });

  it('names the seven white keys as naturals', () => {
    expect([0, 2, 4, 5, 7, 9, 11].map((pc) => label(defaultSpellingFor(pc)))).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ]);
  });

  it('lands each default spelling on its own pitch class', () => {
    for (let pc = 0; pc < 12; pc += 1) {
      expect(pitchClassOf(defaultSpellingFor(pc)), `pc ${pc}`).toBe(pc);
    }
  });

  it('wraps out-of-range input', () => {
    expect(defaultSpellingFor(12)).toEqual(defaultSpellingFor(0));
    expect(defaultSpellingFor(-1)).toEqual(defaultSpellingFor(11));
  });
});

describe('referenceStaffNotes', () => {
  it('writes Rast from C4 up to C5', () => {
    const notes = referenceStaffNotes(rast, 4);
    expect(notes).toHaveLength(8);
    expect(notes[0]).toEqual({ letter: 'C', accidental: 'n', octave: 4 });
    expect(notes[7]).toEqual({ letter: 'C', accidental: 'n', octave: 5 });
  });

  it('keeps the half-flats', () => {
    expect(referenceStaffNotes(rast, 4).map(label).join(' ')).toBe(
      'C D E½♭ F G A B½♭ C',
    );
  });

  it('is empty with no maqam', () => {
    expect(referenceStaffNotes(undefined, 4)).toEqual([]);
  });
});
