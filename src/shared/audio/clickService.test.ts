import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockAudioContext } from './__test__/mockAudioContext';
import { loadClickSample, playClickSampleAt } from './clickService';

const fakeBuffer = { duration: 0.05 } as AudioBuffer;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('loadClickSample', () => {
  it('decodes and caches the sample per URL', async () => {
    const ctx = createMockAudioContext();
    ctx.decodeAudioData.mockResolvedValue(fakeBuffer);
    const fetchSpy = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal('fetch', fetchSpy);

    const url = `/click-${Math.random()}.mp3`;
    const first = await loadClickSample(ctx as unknown as AudioContext, url);
    const second = await loadClickSample(ctx as unknown as AudioContext, url);

    expect(first?.buffer).toBe(fakeBuffer);
    expect(second?.buffer).toBe(fakeBuffer);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('returns null instead of throwing when fetch fails', async () => {
    const ctx = createMockAudioContext();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const result = await loadClickSample(ctx as unknown as AudioContext, `/missing-${Math.random()}.mp3`);
    expect(result).toBeNull();
  });
});

describe('playClickSampleAt', () => {
  it('schedules at the requested audio time with clamped volume', () => {
    const ctx = createMockAudioContext();
    ctx._time = 1;
    playClickSampleAt(ctx as unknown as AudioContext, { buffer: fakeBuffer }, 2.5, 1.7, 1.5);

    const source = ctx._sources[0];
    expect(source.start).toHaveBeenCalledWith(2.5);
    expect((source as unknown as { playbackRate: { value: number } }).playbackRate.value).toBe(1.5);
    expect(ctx._gains[0].gain.setValueAtTime).toHaveBeenCalledWith(1, 2.5);
  });

  it('never schedules in the past (clamps to just after currentTime)', () => {
    const ctx = createMockAudioContext();
    ctx._time = 5;
    playClickSampleAt(ctx as unknown as AudioContext, { buffer: fakeBuffer }, 4, 0.5);

    const startArg = (ctx._sources[0].start as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(startArg).toBeCloseTo(5.002, 5);
  });
});
