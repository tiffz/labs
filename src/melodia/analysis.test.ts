import { describe, expect, it } from 'vitest';
import { pitchMatchStats } from './analysis';
import type { PitchedOnset } from './music';
import type { PitchTrailPoint } from './types';

const ONSETS: PitchedOnset[] = [
  { tSec: 0, midi: 60, durSec: 0.5 },
  { tSec: 0.5, midi: 64, durSec: 0.5 },
  { tSec: 1.0, midi: 67, durSec: 0.5 },
];

function buildTrail(samples: Array<[number, number | null]>): PitchTrailPoint[] {
  return samples.map(([t, midi]) => ({ t, midi }));
}

describe('pitchMatchStats.perNote', () => {
  it('groups samples into the matching onset window', () => {
    const trail = buildTrail([
      [0.05, 60],
      [0.2, 60],
      [0.4, 60],
      [0.55, 64],
      [0.7, 64],
      [0.95, 65],
      [1.05, 67],
      [1.3, 67],
    ]);
    const out = pitchMatchStats(trail, ONSETS);
    expect(out.perNote).toHaveLength(3);
    expect(out.perNote[0]!.samplesUsed).toBe(3);
    expect(out.perNote[0]!.closeCount).toBe(3);
    expect(out.perNote[1]!.samplesUsed).toBe(3);
    expect(out.perNote[1]!.closeCount).toBe(3);
    expect(out.perNote[2]!.samplesUsed).toBe(2);
    expect(out.perNote[2]!.closeCount).toBe(2);
  });

  it('counts samples drifted ≥ 1 semitone as not-close', () => {
    const trail = buildTrail([
      [0.1, 58],
      [0.3, 60],
      [0.55, 70],
      [0.8, 64],
    ]);
    const out = pitchMatchStats(trail, ONSETS);
    expect(out.perNote[0]!.samplesUsed).toBe(2);
    expect(out.perNote[0]!.closeCount).toBe(1);
    expect(out.perNote[1]!.samplesUsed).toBe(2);
    expect(out.perNote[1]!.closeCount).toBe(1);
  });

  it('skips null-midi samples', () => {
    const trail = buildTrail([
      [0.05, null],
      [0.1, 60],
      [0.2, null],
      [0.3, 60],
    ]);
    const out = pitchMatchStats(trail, ONSETS);
    expect(out.perNote[0]!.samplesUsed).toBe(2);
  });

  it('drops samples after the last onset window', () => {
    const trail = buildTrail([
      [0.4, 60],
      [10, 60],
    ]);
    const out = pitchMatchStats(trail, ONSETS);
    expect(out.perNote[0]!.samplesUsed).toBe(1);
    expect(out.perNote[1]!.samplesUsed).toBe(0);
    expect(out.perNote[2]!.samplesUsed).toBe(0);
  });

  it('returns empty perNote for empty pitched onsets', () => {
    const out = pitchMatchStats(buildTrail([[0.1, 60]]), []);
    expect(out.perNote).toEqual([]);
    expect(out.tier).toBe('bronze');
  });
});
