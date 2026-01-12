import { describe, it, expect } from 'vitest';
import { BeatGrid } from './beatGrid';

describe('BeatGrid', () => {
  describe('timing calculations', () => {
    it('should calculate correct beat duration at 120 BPM', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      expect(grid.beatDuration).toBe(0.5); // 60/120 = 0.5 seconds
    });

    it('should calculate correct beat duration at 60 BPM', () => {
      const grid = new BeatGrid(60, { numerator: 4, denominator: 4 });
      expect(grid.beatDuration).toBe(1.0); // 60/60 = 1.0 second
    });

    it('should calculate correct measure duration in 4/4 at 120 BPM', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      expect(grid.measureDuration).toBe(2.0); // 4 beats * 0.5 seconds
    });

    it('should calculate correct measure duration in 3/4 at 120 BPM', () => {
      const grid = new BeatGrid(120, { numerator: 3, denominator: 4 });
      expect(grid.measureDuration).toBe(1.5); // 3 beats * 0.5 seconds
    });

    it('should calculate correct sixteenth duration', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      expect(grid.sixteenthDuration).toBe(0.125); // 0.5 / 4 = 0.125 seconds
    });
  });

  describe('getPosition', () => {
    it('should return beat 0, measure 0 at time 0', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      const pos = grid.getPosition(0);
      expect(pos.measure).toBe(0);
      expect(pos.beat).toBe(0);
      expect(pos.sixteenth).toBe(0);
      expect(pos.progress).toBeCloseTo(0);
    });

    it('should return correct position at beat boundaries', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      
      // At exactly 0.5 seconds (beat 1)
      const pos1 = grid.getPosition(0.5);
      expect(pos1.measure).toBe(0);
      expect(pos1.beat).toBe(1);
      expect(pos1.sixteenth).toBe(0);
      
      // At exactly 1.0 seconds (beat 2)
      const pos2 = grid.getPosition(1.0);
      expect(pos2.measure).toBe(0);
      expect(pos2.beat).toBe(2);
      
      // At exactly 2.0 seconds (measure 1, beat 0)
      const pos3 = grid.getPosition(2.0);
      expect(pos3.measure).toBe(1);
      expect(pos3.beat).toBe(0);
    });

    it('should handle start offset correctly', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 }, 1.0);
      
      // At time 1.0, should be at beat 0 (offset start)
      const pos1 = grid.getPosition(1.0);
      expect(pos1.measure).toBe(0);
      expect(pos1.beat).toBe(0);
      
      // At time 1.5, should be at beat 1
      const pos2 = grid.getPosition(1.5);
      expect(pos2.measure).toBe(0);
      expect(pos2.beat).toBe(1);
    });

    it('should return measure 0 beat 0 for negative times', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 }, 1.0);
      const pos = grid.getPosition(0.5); // Before offset
      expect(pos.measure).toBe(0);
      expect(pos.beat).toBe(0);
    });
  });

  describe('getTime', () => {
    it('should return 0 for position (0, 0, 0, 0)', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      const time = grid.getTime({ measure: 0, beat: 0, sixteenth: 0, progress: 0 });
      expect(time).toBe(0);
    });

    it('should return correct time for beat positions', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      
      expect(grid.getTime({ measure: 0, beat: 1, sixteenth: 0, progress: 0 })).toBe(0.5);
      expect(grid.getTime({ measure: 0, beat: 2, sixteenth: 0, progress: 0 })).toBe(1.0);
      expect(grid.getTime({ measure: 1, beat: 0, sixteenth: 0, progress: 0 })).toBe(2.0);
    });

    it('should include start offset in returned time', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 }, 5.0);
      const time = grid.getTime({ measure: 0, beat: 0, sixteenth: 0, progress: 0 });
      expect(time).toBe(5.0);
    });
  });

  describe('round-trip consistency (getPosition ↔ getTime)', () => {
    const testCases = [
      { bpm: 60, time: 0 },
      { bpm: 60, time: 1.0 },
      { bpm: 60, time: 10.0 },
      { bpm: 120, time: 0 },
      { bpm: 120, time: 0.5 },
      { bpm: 120, time: 2.0 },
      { bpm: 120, time: 60.0 },
      { bpm: 140, time: 0 },
      { bpm: 140, time: 30.0 },
      { bpm: 200, time: 0 },
      { bpm: 200, time: 120.0 },
    ];

    it.each(testCases)('should round-trip at $bpm BPM, time=$time', ({ bpm, time }) => {
      const grid = new BeatGrid(bpm, { numerator: 4, denominator: 4 });
      const position = grid.getPosition(time);
      // Get time of the start of the current sixteenth (without progress)
      const roundedPosition = { ...position, progress: 0 };
      const recoveredTime = grid.getTime(roundedPosition);
      
      // The recovered time should be <= original time and within one sixteenth
      expect(recoveredTime).toBeLessThanOrEqual(time + 0.0001); // Small epsilon for floating point
      expect(time - recoveredTime).toBeLessThan(grid.sixteenthDuration);
    });
  });

  describe('long playback stability', () => {
    it('should not accumulate floating point errors over 1 hour at 120 BPM', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      const oneHour = 3600; // seconds
      
      // Check position at 1 hour
      const pos = grid.getPosition(oneHour);
      
      // At 120 BPM, 1 hour = 7200 beats = 1800 measures
      expect(pos.measure).toBe(1800);
      expect(pos.beat).toBe(0);
      
      // Verify round-trip
      const recoveredTime = grid.getTime({ measure: 1800, beat: 0, sixteenth: 0, progress: 0 });
      expect(recoveredTime).toBeCloseTo(oneHour, 6); // 6 decimal places precision
    });

    it('should not accumulate errors over 10 hours at 200 BPM', () => {
      const grid = new BeatGrid(200, { numerator: 4, denominator: 4 });
      const tenHours = 36000; // seconds
      
      // At 200 BPM in 4/4, measure duration = 4 * (60/200) = 1.2 seconds
      // 10 hours = 36000 / 1.2 = 30000 measures
      const pos = grid.getPosition(tenHours);
      expect(pos.measure).toBe(30000);
      expect(pos.beat).toBe(0);
      
      const recoveredTime = grid.getTime({ measure: 30000, beat: 0, sixteenth: 0, progress: 0 });
      expect(recoveredTime).toBeCloseTo(tenHours, 5);
    });

    it('should maintain beat accuracy across measure boundaries', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      
      // Test 1000 consecutive beat boundaries
      for (let beat = 0; beat < 1000; beat++) {
        const expectedTime = beat * 0.5; // 0.5 seconds per beat at 120 BPM
        const pos = grid.getPosition(expectedTime);
        
        const expectedMeasure = Math.floor(beat / 4);
        const expectedBeatInMeasure = beat % 4;
        
        expect(pos.measure).toBe(expectedMeasure);
        expect(pos.beat).toBe(expectedBeatInMeasure);
        expect(pos.sixteenth).toBe(0);
      }
    });
  });

  describe('getNextBeatTime', () => {
    it('should return next beat time correctly', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      
      // From beat 0, next beat is at 0.5
      expect(grid.getNextBeatTime(0)).toBe(0.5);
      
      // From middle of beat 0, next beat is still at 0.5
      expect(grid.getNextBeatTime(0.25)).toBe(0.5);
      
      // From beat 3, next beat is measure 1 beat 0
      expect(grid.getNextBeatTime(1.5)).toBe(2.0);
    });
  });

  describe('edge cases', () => {
    it('should handle very small time increments', () => {
      const grid = new BeatGrid(120, { numerator: 4, denominator: 4 });
      
      const pos1 = grid.getPosition(0.001);
      const pos2 = grid.getPosition(0.002);
      
      // Both should be in beat 0, but progress should differ
      expect(pos1.beat).toBe(0);
      expect(pos2.beat).toBe(0);
      expect(pos2.progress).toBeGreaterThan(pos1.progress);
    });

    it('should handle very high BPM (300 BPM)', () => {
      const grid = new BeatGrid(300, { numerator: 4, denominator: 4 });
      
      // At 300 BPM, beat duration is 0.2 seconds
      expect(grid.beatDuration).toBe(0.2);
      
      // At 1 second, we should be at beat 5 = measure 1, beat 1
      const pos = grid.getPosition(1.0);
      expect(pos.measure).toBe(1);
      expect(pos.beat).toBe(1);
    });

    it('should handle very low BPM (40 BPM)', () => {
      const grid = new BeatGrid(40, { numerator: 4, denominator: 4 });
      
      // At 40 BPM, beat duration is 1.5 seconds
      expect(grid.beatDuration).toBe(1.5);
      
      // At 6 seconds, we should be at measure 1, beat 0
      const pos = grid.getPosition(6.0);
      expect(pos.measure).toBe(1);
      expect(pos.beat).toBe(0);
    });

    it('should handle 6/8 time signature', () => {
      const grid = new BeatGrid(120, { numerator: 6, denominator: 8 });
      
      // In 6/8, each beat is an eighth note (half of quarter note duration)
      expect(grid.beatDuration).toBe(0.25); // 60/120/2
      
      // Measure has 6 beats
      expect(grid.measureDuration).toBe(1.5); // 6 * 0.25
    });
  });
});
