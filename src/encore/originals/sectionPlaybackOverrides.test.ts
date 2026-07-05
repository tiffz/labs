import { describe, expect, it } from 'vitest';
import { DEFAULT_CHORD_PLAYBACK_SETTINGS } from '../../shared/music/chordPlaybackSettings';
import {
  createSectionPlaybackOverrideFromGlobal,
  setOriginalsSectionPlaybackOverride,
} from './sectionPlaybackOverrides';

describe('setOriginalsSectionPlaybackOverride', () => {
  it('adds and removes section overrides', () => {
    const withOverride = setOriginalsSectionPlaybackOverride(undefined, 'chorus-0', {
      customPlayback: true,
      chordStyleId: 'jazz',
    });
    expect(withOverride?.['chorus-0']?.chordStyleId).toBe('jazz');

    const cleared = setOriginalsSectionPlaybackOverride(withOverride, 'chorus-0', null);
    expect(cleared).toBeUndefined();
  });
});

describe('createSectionPlaybackOverrideFromGlobal', () => {
  it('seeds custom playback from global settings', () => {
    expect(createSectionPlaybackOverrideFromGlobal({
      ...DEFAULT_CHORD_PLAYBACK_SETTINGS,
      chordStyleId: 'simple',
      drumsEnabled: true,
      drumPattern: 'D-T-K-T-',
    })).toEqual({
      customPlayback: true,
      chordStyleId: 'simple',
      drumsEnabled: true,
      drumPattern: 'D-T-K-T-',
    });
  });
});
