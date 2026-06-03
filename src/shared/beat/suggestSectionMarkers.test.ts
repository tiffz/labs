import { describe, expect, it } from 'vitest';
import { sectionsToSuggestedMarkers } from './suggestSectionMarkers';
import type { Section } from './sectionDetector';

describe('suggestSectionMarkers helpers', () => {
  it('converts interior section starts to marker suggestions', () => {
    const sections: Section[] = [
      { id: 'a', startTime: 0, endTime: 30, label: 'M1-8', color: '#000', confidence: 1 },
      { id: 'b', startTime: 30, endTime: 60, label: 'M9-16', color: '#000', confidence: 1 },
    ];
    expect(sectionsToSuggestedMarkers(sections)).toEqual([{ time: 30, label: 'M9-16' }]);
  });
});
