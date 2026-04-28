import { describe, expect, it } from 'vitest';
import { buildClickSchedule, slotsPerMeasure } from '../../shared/audio/singInTimeClock';
import { SUBDIVISION_LADDER } from './levels';

describe('SUBDIVISION_LADDER click alignment', () => {
  it('each level baseMidis matches click schedule length', () => {
    for (const lv of SUBDIVISION_LADDER) {
      const sched = buildClickSchedule(lv.grid, lv.bpm, lv.measures, false);
      expect(sched.length, lv.id).toBe(lv.baseMidis.length);
      if (lv.grid !== 'mixed') {
        expect(sched.length, lv.id).toBe(slotsPerMeasure(lv.grid) * lv.measures);
      }
    }
  });
});
