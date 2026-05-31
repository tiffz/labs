import { describe, expect, it } from 'vitest';
import {
  computePracticeSectionResize,
  loopRegionForSelectedSections,
} from './practiceSectionResize';

describe('computePracticeSectionResize', () => {
  const baseSection = { startTime: 10, endTime: 20 };

  it('clamps resize time to track duration', () => {
    expect(
      computePracticeSectionResize({
        section: baseSection,
        edge: 'end',
        newTime: 999,
        effectiveDuration: 30,
        alignLoopToMetronome: false,
        effectiveBpm: 120,
        beatsPerMeasure: 4,
        syncStartTime: 0,
      })
    ).toEqual({ startTime: 10, endTime: 30 });
  });

  it('rejects start edge moves that would collapse the section', () => {
    expect(
      computePracticeSectionResize({
        section: baseSection,
        edge: 'start',
        newTime: 19.6,
        effectiveDuration: 60,
        alignLoopToMetronome: false,
        effectiveBpm: 120,
        beatsPerMeasure: 4,
        syncStartTime: 0,
      })
    ).toBeNull();
  });

  it('snaps to measure boundaries when alignLoopToMetronome is enabled', () => {
    expect(
      computePracticeSectionResize({
        section: baseSection,
        edge: 'start',
        newTime: 12.3,
        effectiveDuration: 60,
        alignLoopToMetronome: true,
        effectiveBpm: 120,
        beatsPerMeasure: 4,
        syncStartTime: 0,
      })
    ).toEqual({ startTime: 12, endTime: 20 });
  });
});

describe('loopRegionForSelectedSections', () => {
  it('returns null when nothing is selected', () => {
    expect(
      loopRegionForSelectedSections(
        [{ id: 'a', startTime: 0, endTime: 10 }],
        []
      )
    ).toBeNull();
  });

  it('spans min start and max end of selected sections', () => {
    expect(
      loopRegionForSelectedSections(
        [
          { id: 'a', startTime: 5, endTime: 12 },
          { id: 'b', startTime: 15, endTime: 22 },
        ],
        ['a', 'b']
      )
    ).toEqual({ startTime: 5, endTime: 22 });
  });
});
