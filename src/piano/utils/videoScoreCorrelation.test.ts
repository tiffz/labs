import { describe, it, expect } from 'vitest';
import { lookupAudioTime } from './videoScoreCorrelation';
import type { TimeMappingPoint } from './videoScoreCorrelation';

describe('lookupAudioTime', () => {
  it('returns null for empty mapping', () => {
    expect(lookupAudioTime([], 5)).toBeNull();
  });

  it('clamps to first point for negative score time', () => {
    const mapping: TimeMappingPoint[] = [
      { scoreSec: 0, audioSec: 2.0 },
      { scoreSec: 10, audioSec: 12.0 },
    ];
    expect(lookupAudioTime(mapping, -1)).toBe(2.0);
  });

  it('clamps to last point for score time beyond the mapping', () => {
    const mapping: TimeMappingPoint[] = [
      { scoreSec: 0, audioSec: 0.5 },
      { scoreSec: 5, audioSec: 5.5 },
    ];
    expect(lookupAudioTime(mapping, 100)).toBe(5.5);
  });

  it('returns exact audio time for exact score time match', () => {
    const mapping: TimeMappingPoint[] = [
      { scoreSec: 0, audioSec: 0 },
      { scoreSec: 5, audioSec: 7 },
      { scoreSec: 10, audioSec: 15 },
    ];
    expect(lookupAudioTime(mapping, 0)).toBe(0);
    expect(lookupAudioTime(mapping, 10)).toBe(15);
  });

  it('interpolates linearly between mapping points', () => {
    const mapping: TimeMappingPoint[] = [
      { scoreSec: 0, audioSec: 0 },
      { scoreSec: 10, audioSec: 20 },
    ];
    // Midpoint: scoreSec=5 → audioSec=10 (ratio 2:1)
    expect(lookupAudioTime(mapping, 5)).toBeCloseTo(10, 5);
  });

  it('handles non-linear mapping with many points', () => {
    const mapping: TimeMappingPoint[] = [
      { scoreSec: 0, audioSec: 0 },
      { scoreSec: 2, audioSec: 1 },
      { scoreSec: 4, audioSec: 5 },
      { scoreSec: 6, audioSec: 6 },
      { scoreSec: 8, audioSec: 10 },
    ];
    // Between scoreSec 2 and 4: audioSec 1 to 5
    // At scoreSec 3: 1 + 0.5*(5-1) = 3
    expect(lookupAudioTime(mapping, 3)).toBeCloseTo(3, 5);
  });

  it('works with a single mapping point', () => {
    const mapping: TimeMappingPoint[] = [{ scoreSec: 5, audioSec: 3 }];
    expect(lookupAudioTime(mapping, 5)).toBe(3);
    expect(lookupAudioTime(mapping, 0)).toBe(3);
    expect(lookupAudioTime(mapping, 100)).toBe(3);
  });

  it('binary search handles large mappings correctly', () => {
    const mapping: TimeMappingPoint[] = [];
    for (let i = 0; i <= 1000; i++) {
      mapping.push({ scoreSec: i * 0.1, audioSec: i * 0.12 });
    }
    // scoreSec 50.0 → audioSec 60.0
    expect(lookupAudioTime(mapping, 50.0)).toBeCloseTo(60.0, 3);
    // scoreSec 25.05 → between 25.0 (30.0) and 25.1 (30.12), ~30.06
    expect(lookupAudioTime(mapping, 25.05)).toBeCloseTo(30.06, 2);
  });
});
