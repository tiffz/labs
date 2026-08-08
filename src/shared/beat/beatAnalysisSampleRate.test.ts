import { describe, expect, it } from 'vitest';
import { BEAT_ANALYSIS_SAMPLE_RATE } from './decodeMediaForBeat';
import { getEssentia } from './essentiaSingleton';

/**
 * The sample-rate contract for beat analysis.
 *
 * Essentia's `RhythmExtractor2013(signal, maxTempo, method, minTempo)` has **no sample-rate
 * parameter** — 44.1 kHz is fixed inside the algorithm. The pipeline decoded through the live
 * *playback* `AudioContext`, whose rate is the output device's (48 kHz on most Macs and every
 * Bluetooth device), so every tempo came back scaled by 44100/48000 = 0.91875 with no error raised
 * and no drop in reported confidence. A 100 BPM song was detected as 92, and the beat grid drifted
 * a full beat every ~11 beats — which is why even bare drum loops failed.
 *
 * The entire existing suite was structurally blind to this: every fixture in
 * `regression/syntheticAudioGenerator.ts` is generated at exactly 44100, the one rate at which the
 * bug cancels. These tests are parametrised over both rates precisely so that cannot recur.
 */

/** Decaying noise bursts on the beat — the easiest possible input for a beat tracker. */
function drumLoop(sampleRate: number, bpm: number, seconds = 20): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  const period = (60 / bpm) * sampleRate;
  const decay = sampleRate * 0.004;
  let seed = 12345;
  const rand = (): number => {
    // Deterministic LCG so the fixture is stable across runs.
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed / 2147483648) * 2 - 1;
  };
  for (let beat = 0; beat * period < n; beat += 1) {
    const start = Math.floor(beat * period);
    for (let i = 0; i < sampleRate * 0.012 && start + i < n; i += 1) {
      out[start + i] = rand() * Math.exp(-i / decay);
    }
  }
  return out;
}

describe('beat analysis sample-rate contract', () => {
  it('Essentia has no sampleRate parameter, so 44.1 kHz is a hard requirement', async () => {
    const essentia = await getEssentia();
    // Documents WHY the constant exists. If a future essentia.js exposes a rate parameter this
    // assertion is the prompt to revisit `toBeatAnalysisBuffer`.
    expect(essentia.RhythmExtractor2013.length).toBeLessThanOrEqual(4);
    expect(BEAT_ANALYSIS_SAMPLE_RATE).toBe(44100);
  });

  it.each([100, 120, 140])(
    'detects %i BPM correctly at the analysis rate',
    async (bpm) => {
      const essentia = await getEssentia();
      const signal = essentia.arrayToVector(drumLoop(BEAT_ANALYSIS_SAMPLE_RATE, bpm));
      const detected = essentia.RhythmExtractor2013(signal, 208, 'multifeature', 40).bpm as number;
      expect(Math.abs(detected - bpm) / bpm).toBeLessThan(0.02);
    },
    60_000,
  );

  it('mis-detects by exactly the rate ratio when handed 48 kHz — the bug this guards', async () => {
    // Pins the failure mode itself. If someone reintroduces the playback-context decode, the
    // production asserts throw; this test explains what they are protecting against.
    const essentia = await getEssentia();
    const at44 = essentia.RhythmExtractor2013(
      essentia.arrayToVector(drumLoop(44100, 120)),
      208,
      'multifeature',
      40,
    ).bpm as number;
    const at48 = essentia.RhythmExtractor2013(
      essentia.arrayToVector(drumLoop(48000, 120)),
      208,
      'multifeature',
      40,
    ).bpm as number;

    expect(Math.abs(at44 - 120) / 120).toBeLessThan(0.02);
    // 44100/48000 = 0.91875 — the exact scaling users saw on every song.
    expect(at48 / at44).toBeCloseTo(44100 / 48000, 2);
  }, 60_000);
});
