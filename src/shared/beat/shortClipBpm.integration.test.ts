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
    const result = await detectTempoEnsemble(buffer);
    expect(Math.abs(result.consensusBpm - 120)).toBeLessThanOrEqual(5);
  });

  it('detects 120 BPM when analyzing a short section slice (Stanza segment path)', async () => {
    const slice = generateSyntheticAudio({
      bpm: 120,
      duration: 12,
      type: 'drumPattern',
      seed: 12002,
    });
    const result = await detectTempoEnsemble(slice);
    expect(Math.abs(result.consensusBpm - 120)).toBeLessThanOrEqual(5);
  });

  it('detects 150 BPM drum loop without octave halving', async () => {
    const buffer = generateSyntheticAudio({
      bpm: 150,
      duration: 15,
      type: 'drumPattern',
      seed: 15001,
    });
    const result = await detectTempoEnsemble(buffer);
    expect(result.consensusBpm).toBeGreaterThan(145);
    expect(result.consensusBpm).toBeLessThan(155);
  });
});
