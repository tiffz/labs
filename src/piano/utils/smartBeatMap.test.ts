import { describe, it, expect } from 'vitest';
import { SmartBeatMap } from './smartBeatMap';

describe('SmartBeatMap', () => {
  // Steady 120 BPM: beats every 0.5 seconds (started at 0.5s)
  const steady120 = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

  // Rubato: BPM varies between ~100 and ~140
  const rubato = [0.0, 0.45, 0.95, 1.5, 1.9, 2.5, 3.1, 3.55, 4.1, 4.5];

  describe('constructor', () => {
    it('filters beats to start from bestOffset', () => {
      const map = new SmartBeatMap(steady120, 1.0);
      expect(map.beatTimes[0]).toBe(0);
      expect(map.beatTimes[1]).toBeCloseTo(0.5, 2);
      expect(map.length).toBe(9); // beats at 1.0, 1.5, 2.0, ..., 5.0
    });

    it('inserts a zero-time start if first beat is after offset', () => {
      const map = new SmartBeatMap([2.0, 2.5, 3.0], 0.5);
      expect(map.beatTimes[0]).toBe(0);
      expect(map.beatTimes[1]).toBeCloseTo(1.5, 2); // 2.0 - 0.5
    });

    it('handles zero offset', () => {
      const map = new SmartBeatMap(rubato, 0);
      expect(map.beatTimes[0]).toBe(0);
      expect(map.length).toBe(rubato.length);
    });

    it('handles empty beats array', () => {
      const map = new SmartBeatMap([], 0);
      expect(map.length).toBe(1); // inserts [0]
    });
  });

  describe('beatToTime', () => {
    it('returns 0 for beat 0', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.beatToTime(0)).toBe(0);
    });

    it('returns exact times for integer beats', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.beatToTime(1)).toBeCloseTo(0.5, 3);
      expect(map.beatToTime(2)).toBeCloseTo(1.0, 3);
    });

    it('interpolates fractional beats', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.beatToTime(0.5)).toBeCloseTo(0.25, 3);
    });

    it('extrapolates beyond the last beat', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      const lastBeat = map.length - 1;
      const lastInterval = map.beatTimes[map.length - 1] - map.beatTimes[map.length - 2];
      expect(map.beatToTime(lastBeat + 1)).toBeCloseTo(map.beatTimes[map.length - 1] + lastInterval, 3);
    });

    it('handles rubato beats with variable intervals', () => {
      const map = new SmartBeatMap(rubato, 0);
      // Beat 1 should be at rubato[1] - rubato[0]
      expect(map.beatToTime(1)).toBeCloseTo(rubato[1], 3);
      // Fractional beat 0.5 should be between rubato[0] and rubato[1]
      const expected = (rubato[0] + rubato[1]) / 2;
      expect(map.beatToTime(0.5)).toBeCloseTo(expected, 3);
    });
  });

  describe('timeToBeat', () => {
    it('returns 0 for time 0', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.timeToBeat(0)).toBe(0);
    });

    it('returns integer beats for exact times', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.timeToBeat(0.5)).toBeCloseTo(1, 3);
      expect(map.timeToBeat(1.0)).toBeCloseTo(2, 3);
    });

    it('interpolates between beats', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.timeToBeat(0.25)).toBeCloseTo(0.5, 3);
    });

    it('extrapolates beyond last beat time', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      const lastTime = map.beatTimes[map.length - 1];
      const lastInterval = map.beatTimes[map.length - 1] - map.beatTimes[map.length - 2];
      expect(map.timeToBeat(lastTime + lastInterval)).toBeCloseTo(map.length, 2);
    });

    it('is consistent with beatToTime (round-trip)', () => {
      const map = new SmartBeatMap(rubato, 0);
      for (const beat of [0, 0.5, 1, 2.7, 5, 8]) {
        const time = map.beatToTime(beat);
        const recovered = map.timeToBeat(time);
        expect(recovered).toBeCloseTo(beat, 2);
      }
    });
  });

  describe('instantBpm', () => {
    it('returns ~120 BPM for steady 120 BPM beats', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      // Interval is 0.5s = 120 BPM
      expect(map.instantBpm(0)).toBeCloseTo(120, 0);
      expect(map.instantBpm(3)).toBeCloseTo(120, 0);
    });

    it('varies for rubato beats', () => {
      const map = new SmartBeatMap(rubato, 0);
      const bpm0 = map.instantBpm(0);
      const bpm3 = map.instantBpm(3);
      // These should be different since rubato has varying intervals
      expect(bpm0).not.toBeCloseTo(bpm3, 0);
    });

    it('clamps to the last known interval for beats beyond map', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      const lastBpm = map.instantBpm(map.length - 2);
      expect(map.instantBpm(100)).toBeCloseTo(lastBpm, 0);
    });

    it('returns 80 BPM fallback for degenerate map', () => {
      const map = new SmartBeatMap([], 0);
      expect(map.instantBpm(0)).toBe(80);
    });
  });

  describe('averageBpm', () => {
    it('returns ~120 for steady 120 BPM', () => {
      const map = new SmartBeatMap(steady120, 0.5);
      expect(map.averageBpm()).toBeCloseTo(120, 0);
    });

    it('returns reasonable average for rubato', () => {
      const map = new SmartBeatMap(rubato, 0);
      const avg = map.averageBpm();
      expect(avg).toBeGreaterThan(80);
      expect(avg).toBeLessThan(200);
    });
  });

  describe('pre-resampled beats (simulating 2:1 ratio already thinned)', () => {
    it('correctly handles thinned beats at score rate', () => {
      // Simulated: beat tracker found 160 BPM beats every ~0.375s,
      // but after resampling (taking every 2nd), we get ~80 BPM beats every ~0.75s
      const thinnedBeats = [0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5, 5.25, 6.0];
      const map = new SmartBeatMap(thinnedBeats, 0);

      expect(map.instantBpm(0)).toBeCloseTo(80, 0);
      expect(map.instantBpm(4)).toBeCloseTo(80, 0);
      expect(map.averageBpm()).toBeCloseTo(80, 0);

      expect(map.beatToTime(4)).toBeCloseTo(3.0, 3);
      expect(map.timeToBeat(3.0)).toBeCloseTo(4, 3);
    });
  });

  describe('gap handling (beats with missing sections)', () => {
    it('extrapolates smoothly beyond the last detected beat', () => {
      // 8 beats then a large gap (song has 4 beats of rest)
      const beatsWithGap = [0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5, 5.25];
      const map = new SmartBeatMap(beatsWithGap, 0);

      // Beat 10 is beyond the map (last beat index = 7), should extrapolate at median interval
      const t10 = map.beatToTime(10);
      expect(t10).toBeGreaterThan(5.25);
      // Should use median interval (~0.75s), so beat 10 ≈ 5.25 + (10-7) * 0.75 = 7.5
      expect(t10).toBeCloseTo(7.5, 1);
    });
  });
});
