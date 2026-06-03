import { describe, expect, it } from 'vitest';
import { beatPracticeSectionsToStanzaMarkers } from './beatPracticeSectionsToMarkers';

describe('beatPracticeSectionsToStanzaMarkers', () => {
  it('maps each practice section start after t=0 to a boundary marker', () => {
    const markers = beatPracticeSectionsToStanzaMarkers([
      { id: 'a', label: 'Part A', startTime: 12, endTime: 24 },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.time).toBe(12);
    expect(markers[0]?.label).toBe('Part A');
  });
});
