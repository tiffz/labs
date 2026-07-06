import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playClickSampleAt } from '../clickService';
import { DEFAULT_SUBDIVISION_VOLUMES } from '../platform/metronome/preferences';
import { GridMetronomeScheduler } from './gridMetronomePlayback';

vi.mock('../clickService', () => ({
  loadClickSample: vi.fn().mockResolvedValue({ buffer: { duration: 0.05 } }),
  playClickSampleAt: vi.fn(),
}));

vi.mock('../../playback/audioContextLifecycle', () => ({
  ensureAudioContextRunning: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./scheduleVoiceSample', () => ({
  scheduleVoiceSampleOnContext: vi.fn(),
}));

vi.mock('./metronomeDrumSamples', () => ({
  loadMetronomeDrumSamples: vi.fn().mockResolvedValue(new Map()),
  playMetronomeDrumSampleAt: vi.fn(),
}));

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
  subdivisionLevel: 1 as const,
  masterVolume: 100,
  masterMuted: false,
};

describe('GridMetronomeScheduler', () => {
  beforeEach(() => {
    vi.mocked(playClickSampleAt).mockClear();
  });

  it('does not reschedule the same slot when configure is called with unchanged params', async () => {
    const scheduler = new GridMetronomeScheduler();
    const timeSignature = { numerator: 4, denominator: 4 };
    const ctx = { currentTime: 1 } as AudioContext;

    scheduler.configure(120, timeSignature, basePrefs, 0);
    await scheduler.pollTimeline(ctx, 0, basePrefs, 100, 0.05);
    expect(playClickSampleAt).toHaveBeenCalledTimes(1);

    scheduler.configure(120, timeSignature, basePrefs, 0);
    await scheduler.pollTimeline(ctx, 0, basePrefs, 100, 0.05);
    expect(playClickSampleAt).toHaveBeenCalledTimes(1);
  });

  it('reschedules after reset even when configure params are unchanged', async () => {
    const scheduler = new GridMetronomeScheduler();
    const timeSignature = { numerator: 4, denominator: 4 };
    const ctx = { currentTime: 1 } as AudioContext;

    scheduler.configure(120, timeSignature, basePrefs, 0);
    await scheduler.pollTimeline(ctx, 0, basePrefs, 100, 0.05);
    expect(playClickSampleAt).toHaveBeenCalledTimes(1);

    scheduler.reset();
    scheduler.configure(120, timeSignature, basePrefs, 0);
    await scheduler.pollTimeline(ctx, 0, basePrefs, 100, 0.05);
    expect(playClickSampleAt).toHaveBeenCalledTimes(2);
  });
});
