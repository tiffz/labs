import { describe, expect, it } from 'vitest';

import { minimumPluckFrequency, renderPluckedString, renderRoomImpulse } from './pluckedString';
import { midiNoteToFrequency } from './maqamSynth';

const SAMPLE_RATE = 44100;

const pluck = (frequency: number, overrides: Partial<Parameters<typeof renderPluckedString>[0]> = {}) =>
  renderPluckedString({
    sampleRate: SAMPLE_RATE,
    frequency,
    seconds: 1,
    sustain: 0.996,
    tone: 0.5,
    seed: 1,
    ...overrides,
  });

/**
 * Measure the fundamental of a rendered buffer by autocorrelation.
 *
 * Deliberately NOT by reading back the delay-line length the synth used — that
 * would be the circular-scoring shape the repo's guardrail rule warns about,
 * where the implementation grades its own homework. This finds the period in
 * the actual samples, so a bug in the feedback loop shows up as a wrong pitch.
 */
function measuredPitch(samples: Float32Array, sampleRate: number): number {
  // Skip the excitation burst; the first few ms are noise, not tone.
  const start = Math.floor(sampleRate * 0.05);
  const window = samples.subarray(start, start + Math.floor(sampleRate * 0.4));

  const minLag = Math.floor(sampleRate / 2000);
  const maxLag = Math.floor(sampleRate / 50);

  // Normalised, so a lag is not rewarded simply for overlapping more samples.
  const scores: number[] = [];
  for (let lag = 0; lag <= maxLag; lag += 1) {
    if (lag < minLag) {
      scores.push(-1);
      continue;
    }
    let product = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i + lag < window.length; i += 1) {
      product += window[i] * window[i + lag];
      energyA += window[i] * window[i];
      energyB += window[i + lag] * window[i + lag];
    }
    scores.push(product / (Math.sqrt(energyA * energyB) || 1));
  }

  // Take the FIRST strong peak, not the global maximum. An unnormalised
  // argmax reported 110 Hz as 220 — a clean octave error — because a decaying
  // string correlates almost as well at half its period as at its period.
  const best = Math.max(...scores);
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    const isPeak = scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1];
    if (isPeak && scores[lag] >= best * 0.9) return sampleRate / lag;
  }
  return sampleRate / scores.indexOf(best);
}

/**
 * Peak absolute amplitude over a slice, for decay checks.
 *
 * Bounds are floored: `SAMPLE_RATE * 0.55` is 24255.000000000004, and a
 * non-integer index into a Float32Array returns `undefined`, which turns the
 * whole measurement into NaN.
 */
function peak(samples: Float32Array, from: number, to: number): number {
  let max = 0;
  const start = Math.max(0, Math.floor(from));
  const end = Math.min(Math.floor(to), samples.length);
  for (let i = start; i < end; i += 1) {
    max = Math.max(max, Math.abs(samples[i]));
  }
  return max;
}

describe('renderPluckedString', () => {
  it('fills the requested duration', () => {
    expect(pluck(220, { seconds: 0.5 })).toHaveLength(SAMPLE_RATE * 0.5);
  });

  it('is deterministic for a given seed', () => {
    expect(Array.from(pluck(220))).toEqual(Array.from(pluck(220)));
  });

  it('produces different noise for different seeds', () => {
    expect(Array.from(pluck(220, { seed: 1 }))).not.toEqual(
      Array.from(pluck(220, { seed: 2 })),
    );
  });

  /**
   * The assertion the whole instrument rests on: what comes out is the pitch
   * that was asked for. Measured from the samples, not from the synth's own
   * parameters.
   */
  it.each([110, 220, 261.63, 440, 880])('renders %p Hz at that pitch', (frequency) => {
    const measured = measuredPitch(pluck(frequency), SAMPLE_RATE);
    // Measured worst case is 4.5 cents, from linear interpolation of the delay
    // line. 8 leaves headroom without letting a real regression through: a
    // quarter-tone is 50, so this is a twelfth of the smallest interval the app
    // has to represent.
    expect(Math.abs(1200 * Math.log2(measured / frequency))).toBeLessThan(8);
  });

  /**
   * And the reason this app exists: a quarter-tone must render as a
   * quarter-tone. A resampled piano would land here by luck; a delay line
   * lands here because the frequency is a parameter.
   */
  it('renders a half-flat between its neighbouring semitones', () => {
    const eFlat = midiNoteToFrequency(63);
    const eHalfFlat = midiNoteToFrequency(64, -50);
    const eNatural = midiNoteToFrequency(64);

    const measured = measuredPitch(pluck(eHalfFlat), SAMPLE_RATE);
    expect(measured).toBeGreaterThan(eFlat);
    expect(measured).toBeLessThan(eNatural);
    expect(Math.abs(1200 * Math.log2(measured / eHalfFlat))).toBeLessThan(8);
  });

  it('decays rather than sustaining forever', () => {
    const samples = pluck(220, { seconds: 2, sustain: 0.99 });
    const early = peak(samples, 0, SAMPLE_RATE * 0.1);
    const late = peak(samples, SAMPLE_RATE * 1.5, SAMPLE_RATE * 2);
    expect(late).toBeLessThan(early * 0.5);
  });

  /**
   * `damping` controls brightness, not loudness.
   *
   * An earlier version asserted that a damped string is quieter after a second.
   * It failed, and measuring showed why twice over: the fundamental decays at
   * `sustain` regardless, and the in-loop blend this control used to be was too
   * weak to change the spectrum at all. Zero-crossing rate is a cheap brightness
   * proxy and tests the property the control actually has.
   */
  it('loses high harmonics as the tone control darkens', () => {
    const brightness = (samples: Float32Array) => {
      const from = Math.floor(SAMPLE_RATE * 0.3);
      const to = Math.floor(SAMPLE_RATE * 0.6);
      let crossings = 0;
      for (let i = from + 1; i < to; i += 1) {
        if (samples[i - 1] <= 0 !== samples[i] <= 0) crossings += 1;
      }
      return crossings;
    };
    const bright = pluck(220, { seconds: 1, tone: 0 });
    const dark = pluck(220, { seconds: 1, tone: 0.9 });
    expect(brightness(dark)).toBeLessThan(brightness(bright));
  });

  it('stays inside the representable range', () => {
    const samples = pluck(220);
    for (let i = 0; i < samples.length; i += 1) {
      expect(Number.isFinite(samples[i])).toBe(true);
      expect(Math.abs(samples[i])).toBeLessThanOrEqual(4);
    }
  });

  /**
   * Silence, not noise or NaN. A frequency of 0 reaching the delay line would
   * divide by zero; the caller should never send one, but "should never" is
   * how a burst of full-scale noise reaches somebody's headphones.
   */
  it.each([0, -100, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns silence for a nonsense frequency (%p)',
    (frequency) => {
      const samples = pluck(frequency);
      expect(peak(samples, 0, samples.length)).toBe(0);
    },
  );

  it('reports the lowest frequency it can represent', () => {
    expect(minimumPluckFrequency(SAMPLE_RATE)).toBeCloseTo(SAMPLE_RATE / 2048, 6);
  });
});

describe('renderRoomImpulse', () => {
  it('returns a stereo pair of the requested length', () => {
    const [left, right] = renderRoomImpulse(SAMPLE_RATE, 0.5);
    expect(left).toHaveLength(SAMPLE_RATE * 0.5);
    expect(right).toHaveLength(SAMPLE_RATE * 0.5);
  });

  it('decorrelates the two channels, or it is not stereo', () => {
    const [left, right] = renderRoomImpulse(SAMPLE_RATE, 0.3);
    expect(Array.from(left)).not.toEqual(Array.from(right));
  });

  it('decays to near silence by the end', () => {
    const [left] = renderRoomImpulse(SAMPLE_RATE, 0.6);
    const early = peak(left, SAMPLE_RATE * 0.02, SAMPLE_RATE * 0.06);
    const late = peak(left, SAMPLE_RATE * 0.55, SAMPLE_RATE * 0.6);
    expect(late).toBeLessThan(early * 0.1);
  });

  it('fades in rather than starting at full level', () => {
    const [left] = renderRoomImpulse(SAMPLE_RATE, 0.5);
    expect(Math.abs(left[0])).toBeLessThan(0.05);
  });

  it('is deterministic', () => {
    const [a] = renderRoomImpulse(SAMPLE_RATE, 0.2, 3);
    const [b] = renderRoomImpulse(SAMPLE_RATE, 0.2, 3);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
