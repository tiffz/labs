import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYBACK_SETTINGS } from '../../../rhythm/types';
import { DEFAULT_AUDIO_MIX, LabsAudioMixBus } from './LabsAudioMixBus';

describe('LabsAudioMixBus', () => {
  it('maps drums playback settings through master × drums × accent', () => {
    const bus = new LabsAudioMixBus({
      ...DEFAULT_AUDIO_MIX,
      master: { volume: 80, muted: false },
      drums: { volume: 50, muted: false },
      metronome: { volume: 40, muted: false },
    });
    const effective = bus.effectivePlaybackSettings(DEFAULT_PLAYBACK_SETTINGS);
    expect(effective.metronomeVolume).toBe(32);
    expect(effective.measureAccentVolume).toBeLessThanOrEqual(100);
  });

  it('returns zero backing gain when muted', () => {
    const bus = new LabsAudioMixBus({
      ...DEFAULT_AUDIO_MIX,
      backing: { volume: 70, muted: true },
    });
    expect(bus.backingGain()).toBe(0);
  });

  it('converts linear drum gain', () => {
    const channel = LabsAudioMixBus.fromLinearDrumGain(0.7, false);
    expect(channel.volume).toBe(70);
    expect(LabsAudioMixBus.linearDrumGain(channel)).toBeCloseTo(0.7);
  });
});
