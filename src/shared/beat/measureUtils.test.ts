import { describe, it, expect } from 'vitest';
import {
  getMeasureDuration,
  getMeasureNumber,
  snapToMeasureStart,
  extendToMeasureBoundary,
  generateMeasureLabel,
} from './measureUtils';

describe('measureUtils', () => {
  describe('getMeasureDuration', () => {
    it('should calculate correct duration at 120 BPM in 4/4', () => {
      expect(getMeasureDuration(120, 4)).toBe(2.0); // 4 beats * 0.5 seconds
    });

    it('should calculate correct duration at 60 BPM in 4/4', () => {
      expect(getMeasureDuration(60, 4)).toBe(4.0); // 4 beats * 1.0 second
    });

    it('should calculate correct duration at 120 BPM in 3/4', () => {
      expect(getMeasureDuration(120, 3)).toBe(1.5); // 3 beats * 0.5 seconds
    });

    it('should calculate correct duration at 140 BPM in 4/4', () => {
      const duration = getMeasureDuration(140, 4);
      expect(duration).toBeCloseTo(4 * (60 / 140), 10);
    });
  });

  describe('getMeasureNumber', () => {
    it('should return 1 for the first measure', () => {
      expect(getMeasureNumber(0, 120, 0, 4)).toBe(1);
      expect(getMeasureNumber(1.0, 120, 0, 4)).toBe(1);
      expect(getMeasureNumber(1.9, 120, 0, 4)).toBe(1);
    });

    it('should return 2 for the second measure', () => {
      expect(getMeasureNumber(2.0, 120, 0, 4)).toBe(2);
      expect(getMeasureNumber(3.5, 120, 0, 4)).toBe(2);
    });

    it('should handle music start offset', () => {
      // Music starts at 5 seconds
      expect(getMeasureNumber(5.0, 120, 5.0, 4)).toBe(1);
      expect(getMeasureNumber(7.0, 120, 5.0, 4)).toBe(2);
    });

    it('should return 0 for times before music start', () => {
      expect(getMeasureNumber(4.0, 120, 5.0, 4)).toBe(0);
    });

    it('should handle high measure numbers accurately', () => {
      // At 120 BPM, 1 hour = 3600 seconds = 1800 measures
      expect(getMeasureNumber(3600, 120, 0, 4)).toBe(1801);
    });
  });

  describe('snapToMeasureStart', () => {
    it('should snap to nearest measure boundary', () => {
      // At 120 BPM in 4/4, measures are 2 seconds long
      // Time 0.5 is closer to 0 than to 2
      expect(snapToMeasureStart(0.5, 120, 0, 4)).toBe(0);
      
      // Time 1.5 is closer to 2 than to 0
      expect(snapToMeasureStart(1.5, 120, 0, 4)).toBe(2);
      
      // Exactly at measure boundary
      expect(snapToMeasureStart(2.0, 120, 0, 4)).toBe(2);
    });

    it('should handle music start offset', () => {
      // Music starts at 1.0, measures at 1.0, 3.0, 5.0...
      expect(snapToMeasureStart(1.5, 120, 1.0, 4)).toBe(1.0);
      expect(snapToMeasureStart(2.5, 120, 1.0, 4)).toBe(3.0);
    });

    it('should return musicStartTime for times before it', () => {
      expect(snapToMeasureStart(0.5, 120, 1.0, 4)).toBe(1.0);
    });
  });

  describe('extendToMeasureBoundary', () => {
    describe('direction: start', () => {
      it('should extend backward to measure boundary', () => {
        // At 120 BPM with 4 beats, measure duration is 2s
        // Measures: M1=0-2s, M2=2-4s, M3=4-6s
        
        // Time 2.5 is in measure 2, should snap back to 2.0 (measure 2 start)
        // measureIndex = 2.5/2 = 1.25, floor(1.25 + 0.05) = floor(1.3) = 1
        // result = 0 + 1*2 = 2.0 ✓
        expect(extendToMeasureBoundary(2.5, 'start', 120, 0, 4)).toBe(2.0);
        
        // Time 3.0 is in measure 2, should snap back to 2.0
        // measureIndex = 3.0/2 = 1.5, floor(1.5 + 0.05) = floor(1.55) = 1
        // result = 0 + 1*2 = 2.0 ✓
        expect(extendToMeasureBoundary(3.0, 'start', 120, 0, 4)).toBe(2.0);
        
        // Time 3.9 is very close to measure 3 boundary (3.9/2 = 1.95)
        // Due to epsilon handling: floor(1.95 + 0.05) = floor(2.0) = 2
        // result = 0 + 2*2 = 4.0 (snaps to next boundary because it's within epsilon)
        expect(extendToMeasureBoundary(3.9, 'start', 120, 0, 4)).toBe(4.0);
      });

      it('should handle times already at measure boundary', () => {
        expect(extendToMeasureBoundary(2.0, 'start', 120, 0, 4)).toBe(2.0);
      });

      it('should handle times very close to boundary (epsilon handling)', () => {
        // Within 50ms of boundary should be treated as on boundary
        expect(extendToMeasureBoundary(2.04, 'start', 120, 0, 4)).toBe(2.0);
      });
    });

    describe('direction: end', () => {
      it('should extend forward to measure boundary', () => {
        // Time 2.5 should extend to 4.0
        expect(extendToMeasureBoundary(2.5, 'end', 120, 0, 4)).toBe(4.0);
        
        // Time 0.1 should extend to 2.0
        expect(extendToMeasureBoundary(0.1, 'end', 120, 0, 4)).toBe(2.0);
      });

      it('should not exceed duration if provided', () => {
        // Duration is 3.0, so extending 2.5 should cap at 3.0
        expect(extendToMeasureBoundary(2.5, 'end', 120, 0, 4, 3.0)).toBe(3.0);
      });
    });

    it('should work correctly with music start offset', () => {
      // Music starts at 1.0, measures at 1.0, 3.0, 5.0...
      expect(extendToMeasureBoundary(1.5, 'start', 120, 1.0, 4)).toBe(1.0);
      expect(extendToMeasureBoundary(1.5, 'end', 120, 1.0, 4)).toBe(3.0);
    });
  });

  describe('generateMeasureLabel', () => {
    it('should generate single measure label', () => {
      // Section from 0 to 1.9 seconds (within measure 1)
      expect(generateMeasureLabel(0, 1.9, 120, 0, 4)).toBe('M1');
    });

    it('should generate range label', () => {
      // Section from 0 to 4 seconds (measures 1-2)
      expect(generateMeasureLabel(0, 4, 120, 0, 4)).toBe('M1-2');
      
      // Section from 2 to 10 seconds (measures 2-5)
      expect(generateMeasureLabel(2, 10, 120, 0, 4)).toBe('M2-5');
    });

    it('should handle music start offset', () => {
      // Music starts at 2.0, section from 2.0 to 6.0 (measures 1-2)
      expect(generateMeasureLabel(2, 6, 120, 2, 4)).toBe('M1-2');
    });
  });

  describe('long-term stability', () => {
    it('should maintain accuracy for measure numbers over long durations', () => {
      // Test at various points over 10 hours
      const testTimes = [0, 60, 3600, 7200, 36000]; // 0, 1min, 1hr, 2hr, 10hr
      
      for (const time of testTimes) {
        const measureNum = getMeasureNumber(time, 120, 0, 4);
        const expectedMeasure = Math.floor(time / 2) + 1; // 2 seconds per measure
        expect(measureNum).toBe(expectedMeasure);
      }
    });

    it('should maintain precision for measure duration calculations', () => {
      // Test that measure duration * measure count = total time
      const bpm = 127; // Non-round BPM
      const beatsPerMeasure = 4;
      const measureDuration = getMeasureDuration(bpm, beatsPerMeasure);
      
      // After 1000 measures, the total time should be accurate
      const expectedTime = 1000 * measureDuration;
      const measuredMeasure = getMeasureNumber(expectedTime, bpm, 0, beatsPerMeasure);
      
      // Should be at measure 1001 (or very close due to floating point)
      expect(measuredMeasure).toBe(1001);
    });
  });
});
