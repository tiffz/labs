import { describe, expect, it } from 'vitest';
import { resolveStanzaRailCalibrationIndex } from './stanzaRailCalibrationTarget';

const base = { segmentCount: 5, lastClickedIndex: null, selectedIndices: [], playbackIndex: null };

describe('resolveStanzaRailCalibrationIndex', () => {
  it('has no target when there are no sections', () => {
    expect(resolveStanzaRailCalibrationIndex({ ...base, segmentCount: 0 })).toBeNull();
  });

  it('prefers the section you last clicked', () => {
    expect(
      resolveStanzaRailCalibrationIndex({ ...base, lastClickedIndex: 3, selectedIndices: [1], playbackIndex: 0 }),
    ).toBe(3);
  });

  it('falls back to the lowest selected section', () => {
    expect(resolveStanzaRailCalibrationIndex({ ...base, selectedIndices: [4, 2, 3], playbackIndex: 0 })).toBe(2);
  });

  it('falls back to what is playing', () => {
    expect(resolveStanzaRailCalibrationIndex({ ...base, playbackIndex: 2 })).toBe(2);
  });

  it('falls back to the first section', () => {
    expect(resolveStanzaRailCalibrationIndex(base)).toBe(0);
  });

  /**
   * The reported dead end. Deselecting must return the rail to the playback default; if the pin
   * survived, the rail would keep editing section 3 with nothing selected and no way back.
   */
  it('returns to the playback default once the click pin and selection are cleared', () => {
    const pinned = { ...base, lastClickedIndex: 3, selectedIndices: [3], playbackIndex: 1 };
    expect(resolveStanzaRailCalibrationIndex(pinned)).toBe(3);

    const afterDeselect = { ...pinned, lastClickedIndex: null, selectedIndices: [] };
    expect(resolveStanzaRailCalibrationIndex(afterDeselect)).toBe(1);
  });

  it('ignores a stale index left over from a shorter song', () => {
    expect(resolveStanzaRailCalibrationIndex({ ...base, segmentCount: 2, lastClickedIndex: 7 })).toBe(0);
    expect(resolveStanzaRailCalibrationIndex({ ...base, segmentCount: 2, selectedIndices: [9] })).toBe(0);
  });
});
