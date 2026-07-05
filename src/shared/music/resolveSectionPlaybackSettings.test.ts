import { describe, expect, it } from 'vitest';
import { DEFAULT_CHORD_PLAYBACK_SETTINGS } from './chordPlaybackSettings';
import {
  resolveSectionPlaybackSettings,
  sectionUsesCustomPlayback,
  type SectionPlaybackOverride,
} from './resolveSectionPlaybackSettings';

describe('resolveSectionPlaybackSettings', () => {
  const global = {
    ...DEFAULT_CHORD_PLAYBACK_SETTINGS,
    chordStyleId: 'simple' as const,
    drumsEnabled: false,
    drumPattern: 'D---D---D---D---',
  };

  it('inherits global settings when no override exists', () => {
    expect(resolveSectionPlaybackSettings(global, undefined, 'verse-0')).toEqual(global);
  });

  it('inherits global settings when customPlayback is false', () => {
    const overrides: Record<string, SectionPlaybackOverride> = {
      'verse-0': { customPlayback: false, chordStyleId: 'jazz' },
    };
    expect(resolveSectionPlaybackSettings(global, overrides, 'verse-0')).toEqual(global);
  });

  it('merges custom playback fields over global settings', () => {
    const overrides: Record<string, SectionPlaybackOverride> = {
      'chorus-0': {
        customPlayback: true,
        chordStyleId: 'jazz',
        drumsEnabled: true,
        drumPattern: 'D-T-K-T-',
      },
    };
    const resolved = resolveSectionPlaybackSettings(global, overrides, 'chorus-0');
    expect(resolved.chordStyleId).toBe('jazz');
    expect(resolved.drumsEnabled).toBe(true);
    expect(resolved.drumPattern).toBe('D-T-K-T-');
    expect(resolved.soundType).toBe(global.soundType);
  });

  it('sectionUsesCustomPlayback reflects override flag', () => {
    const overrides: Record<string, SectionPlaybackOverride> = {
      'chorus-0': { customPlayback: true },
    };
    expect(sectionUsesCustomPlayback(overrides, 'chorus-0')).toBe(true);
    expect(sectionUsesCustomPlayback(overrides, 'verse-0')).toBe(false);
  });
});
