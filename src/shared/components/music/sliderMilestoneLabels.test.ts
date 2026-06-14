import { describe, expect, it } from 'vitest';
import { buildSliderMilestones, pickBpmSliderMilestones } from './sliderMilestoneUtils';

describe('pickBpmSliderMilestones', () => {
  it('keeps full spread for wide Beat / Stanza ranges', () => {
    expect(pickBpmSliderMilestones(20, 300)).toEqual([20, 100, 200, 300]);
  });

  it('drops crowded 200 when max is 220 (Words in Rhythm)', () => {
    expect(pickBpmSliderMilestones(40, 220)).toEqual([40, 100, 220]);
  });
});

describe('buildSliderMilestones', () => {
  it('places 100 at the linear midpoint of 0.25–2 playback range', () => {
    const marks = buildSliderMilestones([0.25, 1, 2], 0.25, 2);
    const one = marks.find((m) => m.value === 1);
    expect(one?.leftPercent).toBeCloseTo(42.86, 1);
    expect(one?.align).toBe('center');
  });
});
