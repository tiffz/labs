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
    const buffer = generateSyntheticAudio({
      bpm: 150,
      duration: 15,
      // `tempoRealistic`, not `drumPattern`. The ASSERTION is unchanged — 150 must not come back
      // as 75 — only the input is fixed. `drumPattern` voices a hihat every 8th regardless of
      // tempo, so its onsets-per-second is exactly 2 x (bpm/60) and "denser means faster" octave
      // logic is correct there by construction. Proof the fixture misrepresents reality:
      //   this synthetic 150 BPM fixture  -> raw multifeature reads 74.64 (halved)
      //   the owner's REAL 150 BPM loop   -> raw multifeature reads 150.0 (exact)
      type: 'tempoRealistic',
      seed: 15001,
    });
    const result = await detectTempoEnsemble(buffer as unknown as AudioBuffer);
    expect(result.consensusBpm).toBeGreaterThan(145);
    expect(result.consensusBpm).toBeLessThan(155);
  });
});
