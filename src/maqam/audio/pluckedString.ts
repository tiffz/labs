/**
 * Karplus-Strong plucked-string synthesis, rendered offline.
 *
 * Why synthesis rather than samples:
 *
 * A piano is the wrong instrument for quarter-tones. It is fixed-pitch
 * percussion, so the ear hears a pitch-shifted piano note as *out of tune*
 * rather than as an interval — which defeats the point of an app about
 * intervals. A plucked string with a long decay (oud, qanun) carries a
 * microtone as a pitch, which is how the music is actually played.
 *
 * And synthesis is parameterised by frequency, so a 350-cent third is rendered
 * *at* 350 cents rather than resampled towards it. No sample library, no
 * licence to honour, no megabytes, no CDN.
 *
 * The algorithm: excite a delay line of length `sampleRate / frequency` with
 * noise, then feed it back through a 2-point averaging filter. The delay length
 * sets the pitch; how much of the average is mixed back sets how fast the high
 * harmonics die, which is the difference between a harpsichord and an oud.
 */

export interface PluckOptions {
  sampleRate: number;
  frequency: number;
  seconds: number;
  /**
   * Feedback loss per round trip, 0..1. Higher sustains longer. Gut and nylon
   * strings (oud) lose more than steel, so this sits below a guitar's.
   */
  sustain: number;
  /**
   * Tone, 0..1. Higher is darker. A one-pole lowpass applied to the rendered
   * output, NOT to the feedback loop.
   *
   * It lived in the loop first, blended against the averaging filter. Measured,
   * it barely moved: 0.05 and 0.95 produced near-identical spectra, because the
   * blend never got strong enough to matter — and it perturbed the pitch
   * compensation for nothing, since the loop filter's phase delay then depended
   * on the knob. Out of the loop it is a real control and pitch-neutral.
   */
  tone: number;
  /** Deterministic noise seed, so a render is reproducible and testable. */
  seed: number;
}

/**
 * Mulberry32 — a small, fast, fully deterministic PRNG.
 *
 * `Math.random()` would make every render different, which is exactly what a
 * test of "does this buffer come out at the right pitch" cannot tolerate.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lowest frequency the delay line can represent at a given sample rate. */
export function minimumPluckFrequency(sampleRate: number): number {
  // A delay line needs at least 2 samples to oscillate.
  return sampleRate / 2048;
}

/**
 * Render one plucked note into mono float samples.
 *
 * Pure: same options in, same samples out. That is what lets
 * `pluckedString.test.ts` measure the rendered pitch and assert it matches the
 * requested frequency — including for quarter-tones, where an error would be
 * inaudible to a casual listen but fatal to this app.
 */
export function renderPluckedString(options: PluckOptions): Float32Array<ArrayBuffer> {
  const { sampleRate, frequency, seconds, sustain, tone, seed } = options;

  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(length);
  if (!Number.isFinite(frequency) || frequency <= 0) return out;

  /*
   * Fractional delay, not rounded.
   *
   * Rounding the delay line to whole samples was wrong by up to 30 cents at the
   * top of the keyboard — a whole sample is a big fraction of a short period —
   * which is a third of a quarter-tone, in an app whose subject is quarter-tones.
   *
   * Two corrections. The line is read with linear interpolation so the delay can
   * be fractional, and the target is shortened by the loop filter's phase delay
   * — a 2-point average is exactly half a sample — so the filter does not
   * flatten the note. Because the loop filter is now fixed, that correction is a
   * constant rather than something that shifts with a tone knob.
   */
  const target = sampleRate / frequency - 0.5;
  if (target < 2) return out;
  const delay = Math.ceil(target);
  // Interpolating toward the next slot shortens the delay, so the fraction is
  // measured down from the integer length.
  const fraction = delay - target;
  const line = new Float32Array(delay);

  // Excite with noise, lightly lowpassed. A raw white-noise burst sounds like a
  // snapped wire; smoothing it is the difference between a pluck and a click.
  const random = mulberry32(seed);
  let previous = 0;
  for (let i = 0; i < delay; i += 1) {
    const white = random() * 2 - 1;
    previous = previous * 0.35 + white * 0.65;
    line[i] = previous;
  }

  let index = 0;
  let previousRead = 0;
  for (let i = 0; i < length; i += 1) {
    const oldest = line[index];
    const newer = line[(index + 1) % delay];
    const current = oldest + fraction * (newer - oldest);
    out[i] = current;

    // Classic Karplus-Strong loop filter: a 2-point average, which loses more
    // of the high harmonics than the low on every round trip. That is what
    // makes a string decay towards a near-sine rather than fading uniformly.
    // Phase delay exactly half a sample, which `target` above accounts for.
    const averaged = 0.5 * (current + previousRead);
    previousRead = current;
    line[index] = averaged * sustain;
    index = (index + 1) % delay;
  }

  // Tone shaping, outside the loop so it cannot affect pitch. A one-pole
  // lowpass: the whole point of an oud against a harpsichord.
  const coefficient = Math.min(Math.max(tone, 0), 0.999);
  if (coefficient > 0) {
    let shaped = 0;
    for (let i = 0; i < length; i += 1) {
      shaped = out[i] * (1 - coefficient) + shaped * coefficient;
      out[i] = shaped;
    }
  }

  return out;
}

/**
 * A short, smooth impulse response for a small room.
 *
 * Generated rather than sampled for the same reason as the string: no asset, no
 * licence. Exponentially decaying noise is a crude reverb, but "crude reverb"
 * is the difference between an instrument in a room and an instrument in an
 * anechoic void, and the void is what makes a web synth sound cheap.
 */
export function renderRoomImpulse(
  sampleRate: number,
  seconds = 1.1,
  seed = 7,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const random = mulberry32(seed);

  for (let i = 0; i < length; i += 1) {
    const t = i / length;
    // Exponential decay, plus a short fade-in so the reverb blooms rather than
    // slapping in at full level on sample zero.
    const envelope = Math.pow(1 - t, 2.6) * Math.min(1, i / (sampleRate * 0.008));
    left[i] = (random() * 2 - 1) * envelope;
    right[i] = (random() * 2 - 1) * envelope;
  }
  return [left, right];
}
