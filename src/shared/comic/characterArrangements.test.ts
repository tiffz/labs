import { describe, expect, it } from 'vitest';

import {
  arrangementsForSpeakerCount,
  defaultArrangementForCount,
  markerPlacementFromArrangement,
} from './characterArrangements';

describe('characterArrangements', () => {
  it('filters arrangements by speaker count', () => {
    expect(arrangementsForSpeakerCount(1).every((row) => row.speakerCount === 1)).toBe(true);
    expect(arrangementsForSpeakerCount(2).every((row) => row.speakerCount === 2)).toBe(true);
    expect(arrangementsForSpeakerCount(3).every((row) => row.speakerCount === 3)).toBe(true);
  });

  it('maps arrangement slots onto a/b/c placement', () => {
    const placement = markerPlacementFromArrangement('facing', 2);
    expect(placement.a?.x).toBeLessThan(0.5);
    expect(placement.b?.x).toBeGreaterThan(0.5);
    expect(placement.c).toBeUndefined();
  });

  it('defaults arrangement for each count', () => {
    expect(defaultArrangementForCount(1)).toBe('closeup');
    expect(defaultArrangementForCount(2)).toBe('facing');
    expect(defaultArrangementForCount(3)).toBe('trio-row');
  });
});
