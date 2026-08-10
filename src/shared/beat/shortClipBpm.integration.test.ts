import { describe, expect, it } from 'vitest';
import { generateSyntheticAudio } from './regression/syntheticAudioGenerator';
import { detectTempoEnsemble } from './tempoEnsemble';

describe('short clip BPM detection (drum loops)', () => {
  it.each([
    { duration: 8, label: '8s' },
    { duration: 12, label: '12s' },
    { duration: 15, label: '15s' },
  ])('detects 120 BPM drum loop in $label clip', async ({ duration }) => {
    const buffer = generateSyntheticAudio({
      bpm: 120,
      duration,
      type: 'drumPattern',
      seed: 12001,
    });
    const result = await detectTempoEnsemble(buffer as unknown as AudioBuffer);
    expect(Math.abs(result.consensusBpm - 120)).toBeLessThanOrEqual(5);
  });

  it('detects 120 BPM when analyzing a short section slice (Stanza segment path)', async () => {
    const slice = generateSyntheticAudio({
      bpm: 120,
      duration: 12,
      type: 'drumPattern',
      seed: 12002,
    });
    const result = await detectTempoEnsemble(slice as unknown as AudioBuffer);
    expect(Math.abs(result.consensusBpm - 120)).toBeLessThanOrEqual(5);
  });

  it('detects 150 BPM drum loop without octave halving', async () => {
    /*
     * `tempoRealistic`, not `drumPattern`. The ASSERTION below is unchanged — 150 must not come
     * back as 75 — only the input is fixed.
     *
     * `drumPattern` voices a hihat on every beat and every 8th unconditionally, so its
     * onsets-per-second is exactly 2 x (bpm/60): a deterministic function of tempo. That makes
     * "denser means faster" octave logic correct BY CONSTRUCTION, and this fixture was the main
     * evidence that such logic works. It does not hold up:
     *
     *   this synthetic 150 BPM fixture   raw multifeature -> 74.64  (halved)
     *   the owner's REAL 150 BPM loop    raw multifeature -> 150.0  (exact)
     *
     * `tempoRealistic` thins subdivisions as tempo rises, the way a drummer does, so density
     * carries no tempo information and the fixture tests detection instead of a tautology.
     */
    const buffer = generateSyntheticAudio({
      bpm: 150,
      duration: 15,
      type: 'tempoRealistic',
      seed: 15001,
    });
    const result = await detectTempoEnsemble(buffer as unknown as AudioBuffer);
    expect(result.consensusBpm).toBeGreaterThan(145);
    expect(result.consensusBpm).toBeLessThan(155);
  });
});
