import { describe, expect, it } from 'vitest';
import { inferQuarterNoteBpmFromOnsets } from './ioiTempoHint';

describe('inferQuarterNoteBpmFromOnsets', () => {
  it('infers 150 BPM from 8th-note drum hits', () => {
    const onsets: number[] = [];
    const eighthInterval = 60 / 150 / 2;
    for (let t = 10; t < 90; t += eighthInterval) {
      onsets.push(t);
    }
    const bpm = inferQuarterNoteBpmFromOnsets(onsets);
    expect(bpm).not.toBeNull();
    expect(bpm!).toBeGreaterThan(145);
    expect(bpm!).toBeLessThan(155);
  });

  it('infers quarter-note BPM from steady 120 BPM hits', () => {
    const onsets: number[] = [];
    const beatInterval = 60 / 120;
    for (let t = 10; t < 90; t += beatInterval) {
      onsets.push(t);
    }
    const bpm = inferQuarterNoteBpmFromOnsets(onsets);
    expect(bpm).not.toBeNull();
    expect(bpm!).toBeGreaterThan(115);
    expect(bpm!).toBeLessThan(125);
  });

  it('infers quarter-note BPM from steady 70 BPM eighth-note hits', () => {
    const onsets: number[] = [];
    const eighthInterval = 60 / 70 / 2;
    for (let t = 10; t < 90; t += eighthInterval) {
      onsets.push(t);
    }
    const bpm = inferQuarterNoteBpmFromOnsets(onsets);
    expect(bpm).not.toBeNull();
    expect(bpm!).toBeGreaterThan(66);
    expect(bpm!).toBeLessThan(74);
  });

  it('returns null for sparse onsets', () => {
    expect(inferQuarterNoteBpmFromOnsets([0, 2, 4])).toBeNull();
  });
});
