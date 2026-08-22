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

/*
 * The click must not depend on how often it is polled.
 *
 * `pollTimeline` scheduled only slots ALREADY CROSSED — the loop ran to `globalSlot`, the slot at
 * `timelineSec` — so every scheduled click landed at or before `ctx.currentTime`, and the guard
 * that drops anything older than 50ms threw the rest away. The effective horizon was zero.
 *
 * That is invisible at 60Hz, because a frame is 16ms and almost nothing is missed. In a hidden tab
 * Chrome clamps timers to ~1Hz, so a whole second of slots collapses to whichever one happened to
 * fall inside the last 50ms: the click drops to roughly one tick a second and comes back on an
 * arbitrary beat. Meanwhile the drum layer schedules 4s ahead and keeps perfect time — the two aux
 * layers making opposite late decisions from the same clock, which is the ADR 0025 shape.
 *
 * Poll cadence is the dimension the bug lives in, so that is what this parametrises over.
 */
describe('click count is independent of poll cadence', () => {
  const timeSignature = { numerator: 4, denominator: 4 };

  /** Run `durationSec` of timeline at `pollHz`, returning how many clicks were scheduled. */
  async function clicksAtCadence(pollHz: number, durationSec: number): Promise<number> {
    vi.mocked(playClickSampleAt).mockClear();
    const scheduler = new GridMetronomeScheduler();
    // Horizon must cover the gap between polls, exactly as a hidden tab requires.
    const lookAheadSec = Math.max(0.25, (1 / pollHz) * 2);
    const ctx = { currentTime: 0 } as { currentTime: number } as AudioContext;
    scheduler.configure(120, timeSignature, basePrefs, 0);

    const step = 1 / pollHz;
    for (let t = 0; t <= durationSec + 1e-9; t += step) {
      (ctx as { currentTime: number }).currentTime = t;
      await scheduler.pollTimeline(ctx, t, basePrefs, 100, 0, lookAheadSec);
    }
    /*
     * Count clicks landing INSIDE the window, not total calls. A larger horizon legitimately
     * schedules past the end of the run — that is the point of look-ahead — and counting those
     * would penalise the very behaviour under test. `playClickSampleAt(ctx, sample, audioTime, …)`.
     */
    return vi
      .mocked(playClickSampleAt)
      .mock.calls.filter(([, , audioTime]) => (audioTime as number) <= durationSec + 1e-6).length;
  }

  it('schedules the same clicks at 1Hz as at 60Hz', async () => {
    const fast = await clicksAtCadence(60, 10);
    const slow = await clicksAtCadence(1, 10);
    expect(fast, 'sanity: 10s at 120bpm quarter grid should be ~20 clicks').toBeGreaterThan(15);
    expect(
      slow,
      `hidden-tab cadence dropped clicks: 60Hz=${fast}, 1Hz=${slow}`
    ).toBe(fast);
  });

  it('holds at intermediate cadences too', async () => {
    const fast = await clicksAtCadence(60, 6);
    for (const hz of [8, 4, 2]) {
      expect(await clicksAtCadence(hz, 6), `cadence ${hz}Hz`).toBe(fast);
    }
  });
});
