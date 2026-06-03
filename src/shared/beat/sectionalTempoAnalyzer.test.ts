/**
 * Test for sectional tempo analysis
 *
 * Run with: npm test -- src/shared/beat/sectionalTempoAnalyzer.test.ts
 */

import { describe, it, expect } from 'vitest';
import { analyzeTempoVariation } from './sectionalTempoAnalyzer';

/** Build quarter-note onsets at a fixed BPM (deterministic — no Math.random). */
function steadyQuarterOnsets(bpm: number, durationSec: number, jitterMs = 0): number[] {
  const interval = 60 / bpm;
  const onsets: number[] = [];
  for (let t = 0; t < durationSec; t += interval) {
    onsets.push(t + jitterMs / 1000);
  }
  return onsets;
}

describe('Sectional Tempo Analyzer', () => {
  it('should detect stable tempo', () => {
    const bpm = 120;
    const onsets = steadyQuarterOnsets(bpm, 60, 5);

    const result = analyzeTempoVariation(onsets, 60, bpm);

    expect(result.hasVariableTempo).toBe(false);
    expect(result.variationPercent).toBeLessThan(2);
  });

  it('should detect variable tempo', () => {
    const onsets: number[] = [];
    let t = 0;

    for (let i = 0; i < 200; i++) {
      const progress = i / 200;
      const currentBpm = 100 + progress * 20;
      const beatInterval = 60 / currentBpm;
      onsets.push(t);
      t += beatInterval;
    }

    const result = analyzeTempoVariation(onsets, t, 110);

    expect(result.hasVariableTempo).toBe(true);
    expect(result.variationPercent).toBeGreaterThan(2);
  });

  it('should treat small human jitter as stable at 70 BPM', () => {
    const bpm = 70;
    const onsets = steadyQuarterOnsets(bpm, 120, 15);

    const result = analyzeTempoVariation(onsets, 120, bpm);

    expect(result.variationPercent).toBeLessThan(3);
  });

  it('should handle song with subdivision onsets', () => {
    const bpm = 70;
    const quarterInterval = 60 / bpm;
    const eighthInterval = quarterInterval / 2;
    const onsets: number[] = [];

    for (let t = 0; t < 60; t += eighthInterval) {
      onsets.push(t);
    }

    const result = analyzeTempoVariation(onsets, 60, bpm);

    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.variationPercent).toBeLessThan(5);
  });

  it('should detect gradual tempo drift over a long section', () => {
    const onsets: number[] = [];
    let t = 0;
    const duration = 180;

    while (t < duration) {
      const progress = t / duration;
      const currentBpm = 68.5 + progress * 1.0;
      const beatInterval = 60 / currentBpm;
      onsets.push(t);
      t += beatInterval;
    }

    const result = analyzeTempoVariation(onsets, duration, 69);

    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.tempoRange.max).toBeGreaterThanOrEqual(result.tempoRange.min);
    expect(result.variationPercent).toBeGreaterThan(0);
  });
});
