import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  measureStartAudioTimeFromEpoch,
  perfMsToAudioContextTime,
  secPerSixteenthAtBpm,
} from './measureClock';

describe('measureClock', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('secPerSixteenthAtBpm falls back for invalid tempo', () => {
    expect(secPerSixteenthAtBpm(0)).toBeCloseTo(60 / 80 / 4, 6);
    expect(secPerSixteenthAtBpm(120)).toBeCloseTo(0.125, 6);
  });

  it('perfMsToAudioContextTime converts performance time to audio time', () => {
    const ctx = { currentTime: 5 } as AudioContext;
    expect(perfMsToAudioContextTime(ctx, 1500)).toBeCloseTo(5.5, 6);
    expect(perfMsToAudioContextTime(ctx, 500)).toBeCloseTo(4.5, 6);
  });

  it('measureStartAudioTimeFromEpoch spaces measures evenly on the audio clock', () => {
    const ctx = { currentTime: 2 } as AudioContext;
    const epoch = 1000;
    const measureMs = 2000;
    const m0 = measureStartAudioTimeFromEpoch(ctx, epoch, 0, measureMs);
    const m1 = measureStartAudioTimeFromEpoch(ctx, epoch, 1, measureMs);
    expect(m1 - m0).toBeCloseTo(2, 6);
  });
});
