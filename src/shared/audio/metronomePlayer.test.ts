import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetronomePlayer } from './metronomePlayer';

describe('MetronomePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports beat resolution callbacks', async () => {
    const audioPlayer = {
      ensureResumed: vi.fn().mockResolvedValue(true),
      playClickNowIfReady: vi.fn(),
      playClick: vi.fn().mockResolvedValue(undefined),
    };
    const metronome = new MetronomePlayer(audioPlayer as never);
    metronome.setLooping(false);
    const events: Array<{ position: number; downbeat: boolean }> = [];
    await metronome.start(
      120,
      { numerator: 4, denominator: 4 },
      1,
      (_, position, isDownbeat) => events.push({ position, downbeat: isDownbeat }),
      undefined,
      'beat',
    );

    vi.advanceTimersByTime(2500);
    expect(events.map((e) => e.position)).toEqual([0, 4, 8, 12]);
    expect(events.filter((e) => e.downbeat)).toHaveLength(1);
  });

  it('supports subdivision resolution callbacks', async () => {
    const audioPlayer = {
      ensureResumed: vi.fn().mockResolvedValue(true),
      playClickNowIfReady: vi.fn(),
      playClick: vi.fn().mockResolvedValue(undefined),
    };
    const metronome = new MetronomePlayer(audioPlayer as never);
    metronome.setLooping(false);
    const positions: number[] = [];
    await metronome.start(
      120,
      { numerator: 4, denominator: 4 },
      1,
      (_, position) => positions.push(position),
      undefined,
      'subdivision',
    );

    vi.advanceTimersByTime(2500);
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(15);
    expect(positions).toHaveLength(16);
  });
});

