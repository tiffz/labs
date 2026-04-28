import { describe, expect, it } from 'vitest';
import { findOnsetIndexInPcm } from './latencyCalibration';

describe('latencyCalibration findOnsetIndexInPcm', () => {
  it('detects energy rise after warmup in synthetic pcm', () => {
    const sr = 8000;
    const warmup = 400;
    const len = warmup + 800;
    const pcm = new Float32Array(len);
    for (let i = warmup; i < len; i++) pcm[i] = Math.sin(i * 0.2) * 0.4;
    const idx = findOnsetIndexInPcm(pcm, sr, { warmupMs: 20, threshold: 0.01, stepSamples: 32 });
    expect(idx).not.toBeNull();
    expect(idx!).toBeGreaterThanOrEqual(warmup - 200);
  });
});
