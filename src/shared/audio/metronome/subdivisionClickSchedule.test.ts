import { describe, expect, it } from 'vitest';
import { scheduleClicksInBeatRange } from './subdivisionClickSchedule';

describe('scheduleClicksInBeatRange', () => {
  it('schedules quarter clicks only in beat mode', () => {
    const clicks = scheduleClicksInBeatRange({
      startBeat: 0,
      endBeat: 4,
      clickMode: 'beat',
      subdivision: 'triplet',
    });
    expect(clicks).toHaveLength(4);
    expect(clicks.map(c => c.beatPosition)).toEqual([0, 1, 2, 3]);
    expect(clicks[0]!.subdivision).toBe('accent');
    expect(clicks[1]!.subdivision).toBe('quarter');
  });

  it('schedules three clicks per beat for triplets in subdivision mode', () => {
    const clicks = scheduleClicksInBeatRange({
      startBeat: 0,
      endBeat: 1,
      clickMode: 'subdivision',
      subdivision: 'triplet',
    });
    expect(clicks).toHaveLength(3);
    expect(clicks[0]!.volume).toBeGreaterThan(clicks[1]!.volume);
    expect(clicks[0]!.playbackRate).toBeLessThan(clicks[1]!.playbackRate);
  });

  it('schedules four clicks per beat for sixteenths', () => {
    const clicks = scheduleClicksInBeatRange({
      startBeat: 0,
      endBeat: 2,
      clickMode: 'subdivision',
      subdivision: 'sixteenth',
    });
    expect(clicks).toHaveLength(8);
  });
});
