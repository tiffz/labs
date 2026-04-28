import { describe, expect, it } from 'vitest';
import { buildClickSchedule, clampBpm, slotsPerMeasure } from './singInTimeClock';

describe('singInTimeClock', () => {
  it('clampBpm restricts to 40–160', () => {
    expect(clampBpm(20)).toBe(40);
    expect(clampBpm(200)).toBe(160);
    expect(clampBpm(96)).toBe(96);
  });

  it('mixed pattern has 24 clicks for one 4/4 measure', () => {
    const s = buildClickSchedule('mixed', 80, 1, false);
    expect(s.length).toBe(24);
  });

  it('uniform grids match slot counts', () => {
    expect(buildClickSchedule('quarter', 72, 2, false).length).toBe(slotsPerMeasure('quarter') * 2);
    expect(buildClickSchedule('eighth', 84, 2, false).length).toBe(slotsPerMeasure('eighth') * 2);
  });
});
