import { describe, expect, it } from 'vitest';

import { detuneForMidiNote, midiNoteToFrequency } from './maqamSynth';
import { MAQAM_PRESETS_BY_ID, deriveDetuneMatrix } from '../data/maqamPresets';
import { microtonalCentsOf, midiNoteOf } from '../notation/maqamAccidentals';

/** A cent is ~0.06% of a frequency; 1e-6 relative is far tighter than audible. */
const closeTo = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-6);

describe('midiNoteToFrequency', () => {
  it('anchors A4 at 440 Hz', () => {
    expect(midiNoteToFrequency(69)).toBe(440);
  });

  it('doubles an octave up and halves an octave down', () => {
    closeTo(midiNoteToFrequency(81), 880);
    closeTo(midiNoteToFrequency(57), 220);
  });

  it('puts middle C near 261.63 Hz', () => {
    expect(midiNoteToFrequency(60)).toBeCloseTo(261.6256, 3);
  });

  /**
   * The whole point of the app: a half-flat must land exactly halfway between
   * two piano keys, in cents. Verified as a ratio rather than a literal so the
   * assertion does not just restate the implementation's constant.
   */
  it('places a -50 cent bend geometrically between adjacent semitones', () => {
    const e4 = midiNoteToFrequency(64);
    const eHalfFlat4 = midiNoteToFrequency(64, -50);
    const eFlat4 = midiNoteToFrequency(63);
    closeTo(eHalfFlat4, Math.sqrt(e4 * eFlat4));
    expect(eHalfFlat4).toBeLessThan(e4);
    expect(eHalfFlat4).toBeGreaterThan(eFlat4);
  });

  it('treats a 100-cent bend as one semitone', () => {
    closeTo(midiNoteToFrequency(60, 100), midiNoteToFrequency(61));
    closeTo(midiNoteToFrequency(60, -100), midiNoteToFrequency(59));
  });

  it('treats a 1200-cent bend as one octave', () => {
    closeTo(midiNoteToFrequency(60, 1200), midiNoteToFrequency(72));
  });

  it('defaults to no bend', () => {
    expect(midiNoteToFrequency(60, 0)).toBe(midiNoteToFrequency(60));
  });
});

describe('detuneForMidiNote', () => {
  const rast = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.rast_c.scaleDegrees).matrix;

  it('bends every octave of a retuned pitch class', () => {
    for (const octave of [2, 3, 4, 5, 6]) {
      const e = (octave + 1) * 12 + 4;
      expect(detuneForMidiNote(e, rast), `E${octave}`).toBe(-50);
    }
  });

  it('leaves untouched pitch classes alone', () => {
    expect(detuneForMidiNote(60, rast)).toBe(0); // C4
    expect(detuneForMidiNote(65, rast)).toBe(0); // F4
  });

  /**
   * Returns 0 for a nonsense note rather than `undefined`, because the caller
   * feeds the result straight into frequency maths — `undefined` would become
   * NaN Hz and a silent-but-live oscillator.
   */
  it('returns 0 rather than undefined for out-of-range input', () => {
    expect(detuneForMidiNote(Number.NaN, rast)).toBe(0);
    expect(detuneForMidiNote(-1, rast)).toBe(-50); // -1 wraps to pitch class 11 (B), half-flat in Rast
    expect(detuneForMidiNote(200, rast)).toBe(0); // 200 % 12 === 8 -> G#, unbent in Rast
  });

  it('never produces a non-finite frequency', () => {
    for (let midi = 0; midi <= 127; midi += 1) {
      const hz = midiNoteToFrequency(midi, detuneForMidiNote(midi, rast));
      expect(Number.isFinite(hz), `midi ${midi}`).toBe(true);
      expect(hz).toBeGreaterThan(0);
    }
  });
});

describe('what you hear matches what is written', () => {
  /**
   * The end-to-end check the spec's accidental bug would have failed. For every
   * preset, playing the key a scale degree sits on — through the derived detune
   * matrix — must produce the frequency that degree is *written* as.
   *
   * This closes the loop between notation and audio without either side scoring
   * itself: the written pitch comes from the accidental table, the sounding
   * pitch from the synth's frequency maths and the derived matrix.
   */
  it.each(Object.values(MAQAM_PRESETS_BY_ID).map((p) => [p.id, p] as const))(
    '%s sounds every degree at its written pitch',
    (_id, preset) => {
      const { matrix } = deriveDetuneMatrix(preset.scaleDegrees);
      for (const degree of preset.scaleDegrees) {
        const midi = midiNoteOf(degree, 4 + degree.octaveOffset);
        const written = midiNoteToFrequency(midi, microtonalCentsOf(degree));
        const sounded = midiNoteToFrequency(midi, detuneForMidiNote(midi, matrix));
        closeTo(sounded, written);
      }
    },
  );

  it('sounds Rast’s third below E natural and above E flat', () => {
    const { matrix } = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.rast_c.scaleDegrees);
    const sounded = midiNoteToFrequency(64, detuneForMidiNote(64, matrix));
    expect(sounded).toBeLessThan(midiNoteToFrequency(64));
    expect(sounded).toBeGreaterThan(midiNoteToFrequency(63));
  });

  it('leaves Hijaz sounding exactly like the piano keys it is played on', () => {
    const { matrix } = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.hijaz_d.scaleDegrees);
    for (const degree of MAQAM_PRESETS_BY_ID.hijaz_d.scaleDegrees) {
      const midi = midiNoteOf(degree, 4 + degree.octaveOffset);
      expect(midiNoteToFrequency(midi, detuneForMidiNote(midi, matrix))).toBe(
        midiNoteToFrequency(midi),
      );
    }
  });
});
