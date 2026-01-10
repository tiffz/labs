import { describe, it, expect } from 'vitest';
import {
  extendToMeasureBoundary,
  mergeSections,
  splitSection,
  updateSectionBoundary,
  type Section,
} from './sectionDetector';

describe('sectionDetector utilities', () => {
  describe('extendToMeasureBoundary', () => {
    // At 120 BPM with 4 beats per measure:
    // - 1 beat = 0.5 seconds
    // - 1 measure = 2 seconds
    const bpm = 120;
    const musicStartTime = 0;
    const beatsPerMeasure = 4;

    it('should extend start time to earlier measure boundary', () => {
      // Time 2.3s is in measure 2 (measures 0-2s, 2-4s)
      // Extending start should go to 2.0s
      const result = extendToMeasureBoundary(2.3, 'start', bpm, musicStartTime, beatsPerMeasure);
      expect(result).toBe(2);
    });

    it('should extend end time to later measure boundary', () => {
      // Time 2.3s is in measure 2 (measures 0-2s, 2-4s)
      // Extending end should go to 4.0s
      const result = extendToMeasureBoundary(2.3, 'end', bpm, musicStartTime, beatsPerMeasure);
      expect(result).toBe(4);
    });

    it('should handle music start time offset', () => {
      // With music starting at 1s, measure boundaries are at 1s, 3s, 5s, etc.
      const result = extendToMeasureBoundary(3.5, 'start', bpm, 1, beatsPerMeasure);
      expect(result).toBe(3);
    });

    it('should not go below musicStartTime when extending start', () => {
      const result = extendToMeasureBoundary(0.5, 'start', bpm, 0, beatsPerMeasure);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should not exceed duration when extending end', () => {
      const duration = 10;
      const result = extendToMeasureBoundary(9.8, 'end', bpm, musicStartTime, beatsPerMeasure, duration);
      expect(result).toBeLessThanOrEqual(duration);
    });

    it('should handle different time signatures', () => {
      // 3/4 time at 120 BPM: 1 measure = 1.5 seconds
      const result = extendToMeasureBoundary(2.0, 'start', bpm, 0, 3);
      expect(result).toBe(1.5);
    });

    it('should extend end time even when very close to a boundary', () => {
      // Time 1.99s should still extend to 2.0s (or beyond)
      const result = extendToMeasureBoundary(1.99, 'end', bpm, musicStartTime, beatsPerMeasure);
      expect(result).toBe(2);
    });

    it('should extend end time to next measure when exactly on boundary', () => {
      // Time exactly on 2.0s should go to 4.0s for end extension
      // This ensures loops don't cut off right at the boundary
      const result = extendToMeasureBoundary(2.0, 'end', bpm, musicStartTime, beatsPerMeasure);
      expect(result).toBe(4);
    });

    it('should return rounded values for precision', () => {
      // Result should be rounded to avoid floating point issues
      const result = extendToMeasureBoundary(2.333, 'start', bpm, musicStartTime, beatsPerMeasure);
      expect(result).toBe(2);
      // Should be a clean number without floating point artifacts
      expect(Number.isInteger(result * 1000)).toBe(true);
    });
  });

  describe('mergeSections', () => {
    const createSections = (): Section[] => [
      { id: 'section-0', startTime: 0, endTime: 10, label: 'M1-5', color: '#fff', confidence: 1 },
      { id: 'section-1', startTime: 10, endTime: 20, label: 'M5-10', color: '#fff', confidence: 1 },
      { id: 'section-2', startTime: 20, endTime: 30, label: 'M10-15', color: '#fff', confidence: 1 },
    ];

    it('should merge two adjacent sections', () => {
      const sections = createSections();
      const result = mergeSections(sections, 0, 1);

      expect(result).toHaveLength(2);
      expect(result[0].startTime).toBe(0);
      expect(result[0].endTime).toBe(20);
    });

    it('should return original array if indices are invalid', () => {
      const sections = createSections();
      const result = mergeSections(sections, -1, 1);
      expect(result).toBe(sections);
    });

    it('should return original array if indices are the same', () => {
      const sections = createSections();
      const result = mergeSections(sections, 1, 1);
      expect(result).toBe(sections);
    });

    it('should handle merging last two sections', () => {
      const sections = createSections();
      const result = mergeSections(sections, 1, 2);

      expect(result).toHaveLength(2);
      expect(result[1].startTime).toBe(10);
      expect(result[1].endTime).toBe(30);
    });
  });

  describe('splitSection', () => {
    const createSections = (): Section[] => [
      { id: 'section-0', startTime: 0, endTime: 20, label: 'M1-10', color: '#fff', confidence: 1 },
      { id: 'section-1', startTime: 20, endTime: 40, label: 'M10-20', color: '#fff', confidence: 1 },
    ];

    it('should split a section at the given time', () => {
      const sections = createSections();
      const result = splitSection(sections, 0, 10);

      expect(result).toHaveLength(3);
      expect(result[0].endTime).toBe(10);
      expect(result[1].startTime).toBe(10);
      expect(result[1].endTime).toBe(20);
    });

    it('should return original array if split time is outside section', () => {
      const sections = createSections();
      const result = splitSection(sections, 0, 25);
      expect(result).toBe(sections);
    });

    it('should return original array if index is invalid', () => {
      const sections = createSections();
      const result = splitSection(sections, -1, 10);
      expect(result).toBe(sections);
    });

    it('should generate unique IDs for split sections', () => {
      const sections = createSections();
      const result = splitSection(sections, 0, 10);

      expect(result[0].id).not.toBe(result[1].id);
    });
  });

  describe('updateSectionBoundary', () => {
    const createSections = (): Section[] => [
      { id: 'section-0', startTime: 0, endTime: 10, label: 'M1-5', color: '#fff', confidence: 1 },
      { id: 'section-1', startTime: 10, endTime: 20, label: 'M5-10', color: '#fff', confidence: 1 },
    ];

    it('should update start boundary', () => {
      const sections = createSections();
      const result = updateSectionBoundary(sections, 1, 'start', 8);

      expect(result[1].startTime).toBe(8);
      expect(result[0].endTime).toBe(8);
    });

    it('should update end boundary', () => {
      const sections = createSections();
      const result = updateSectionBoundary(sections, 0, 'end', 12);

      expect(result[0].endTime).toBe(12);
      expect(result[1].startTime).toBe(12);
    });

    it('should return original array if index is invalid', () => {
      const sections = createSections();
      const result = updateSectionBoundary(sections, -1, 'start', 5);
      expect(result).toBe(sections);
    });

    it('should not allow start to exceed end', () => {
      const sections = createSections();
      const result = updateSectionBoundary(sections, 0, 'start', 15);
      
      // Should clamp to valid range
      expect(result[0].startTime).toBeLessThan(result[0].endTime);
    });
  });
});
