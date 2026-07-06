import { describe, expect, it } from 'vitest';
import {
  resolveRhythmMetronomeClick,
  resolveRhythmMetronomeDrum,
  subdivisionVolumesForLevel,
} from './rhythmMetronomeClick';
import type { MetronomeVisualDot } from './metronomeVisualDots';
import { DEFAULT_SUBDIVISION_VOLUMES } from '../platform/metronome/preferences';

const eighthDot: MetronomeVisualDot = {
  positionInSixteenths: 2,
  tier: 'subdivision',
  subdivision: 'eighth',
};

const beatDot: MetronomeVisualDot = {
  positionInSixteenths: 0,
  tier: 'downbeat',
  subdivision: 'accent',
};

const basePrefs = {
  sourceEnabled: { click: true, voice: false, drum: false },
  subdivisionVolumes: { ...DEFAULT_SUBDIVISION_VOLUMES },
  levelChannelMutes: [],
  channelClickMutes: [],
  channelVoiceMutes: [],
  channelDrumMutes: [],
  clickGain: 0.5,
  voiceGain: 0,
  drumGain: 0,
  voiceMode: 'counting' as const,
  masterVolume: 50,
  masterMuted: false,
};

describe('resolveRhythmMetronomeClick', () => {
  it('returns null when off-beat channel volume is zero', () => {
    const result = resolveRhythmMetronomeClick(eighthDot, basePrefs, 50);
    expect(result).toBeNull();
  });

  it('returns click gain when off-beat channel is audible', () => {
    const result = resolveRhythmMetronomeClick(
      eighthDot,
      {
        ...basePrefs,
        subdivisionVolumes: { ...DEFAULT_SUBDIVISION_VOLUMES, eighth: 0.7 },
        masterVolume: 100,
      },
      100,
    );
    expect(result).not.toBeNull();
    expect(result!.volume).toBeGreaterThan(0);
    expect(result!.playbackRate).toBe(1.5);
  });
});

describe('resolveRhythmMetronomeDrum', () => {
  it('returns null when drum source is disabled', () => {
    expect(
      resolveRhythmMetronomeDrum(
        beatDot,
        { ...basePrefs, sourceEnabled: { click: false, voice: false, drum: false } },
        100,
      ),
    ).toBeNull();
  });

  it('returns drum sample when drum source is enabled', () => {
    const result = resolveRhythmMetronomeDrum(
      beatDot,
      {
        ...basePrefs,
        sourceEnabled: { click: false, voice: false, drum: true },
        drumGain: 0.7,
        masterVolume: 100,
      },
      100,
    );
    expect(result).toEqual({ sound: 'dum', volume: expect.any(Number) });
    expect(result!.volume).toBeGreaterThan(0);
  });

  it('uses default drum gain when enabled but gain slider is still zero', () => {
    const result = resolveRhythmMetronomeDrum(
      beatDot,
      {
        ...basePrefs,
        sourceEnabled: { click: false, voice: false, drum: true },
        drumGain: 0,
        masterVolume: 100,
      },
      100,
    );
    expect(result?.sound).toBe('dum');
    expect(result!.volume).toBeGreaterThan(0);
  });
});

describe('subdivisionVolumesForLevel', () => {
  it('enables off-beat gain when moving to level 2', () => {
    const next = subdivisionVolumesForLevel(2, { ...DEFAULT_SUBDIVISION_VOLUMES });
    expect(next.eighth).toBeGreaterThan(0);
  });
});
