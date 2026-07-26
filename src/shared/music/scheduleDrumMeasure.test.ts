import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChartDrumAudioPlayer, scheduleDrumMeasure } from './scheduleDrumMeasure';
import { createMockAudioContext } from '../audio/__test__/mockAudioContext';
import type { AudioPlayer } from '../audio/audioPlayer';

function mockDrumPlayer(currentTime: number): AudioPlayer {
  const playNowIfReady = vi.fn();
  return {
    getAudioContext: () =>
      ({
        currentTime,
        state: 'running',
      }) as AudioContext,
    playNowIfReady,
  } as unknown as AudioPlayer;
}

describe('scheduleDrumMeasure', () => {
  it('schedules hits on the drum player AudioContext clock', () => {
    const drumPlayer = mockDrumPlayer(12);
    scheduleDrumMeasure({
      drumPlayer,
      pattern: 'D---T---K---T---',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      volume: 0.8,
    });

    const play = drumPlayer.playNowIfReady as ReturnType<typeof vi.fn>;
    expect(play).toHaveBeenCalledTimes(4);
    const secPerSixteenth = 60 / 120 / 4;
    expect(play.mock.calls[0]?.[3]).toBeCloseTo(12.02, 5);
    expect(play.mock.calls[1]?.[3]).toBeCloseTo(12.02 + 4 * secPerSixteenth, 5);
    expect(play.mock.calls[2]?.[3]).toBeCloseTo(12.02 + 8 * secPerSixteenth, 5);
    expect(play.mock.calls[3]?.[3]).toBeCloseTo(12.02 + 12 * secPerSixteenth, 5);
  });

  it('honors an explicit measureStartTime anchor', () => {
    const drumPlayer = mockDrumPlayer(12);
    scheduleDrumMeasure({
      drumPlayer,
      pattern: 'D---T---',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      volume: 0.8,
      measureStartTime: 20,
    });

    const play = drumPlayer.playNowIfReady as ReturnType<typeof vi.fn>;
    const secPerSixteenth = 60 / 120 / 4;
    expect(play.mock.calls[0]?.[3]).toBeCloseTo(20, 5);
    expect(play.mock.calls[1]?.[3]).toBeCloseTo(20 + 4 * secPerSixteenth, 5);
  });

  it('skips hits that are already late instead of clamping them to now', () => {
    const drumPlayer = mockDrumPlayer(30);
    scheduleDrumMeasure({
      drumPlayer,
      pattern: 'D---T---K---T---',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      volume: 0.8,
      // Entire measure is in the past relative to currentTime=30.
      measureStartTime: 20,
    });

    const play = drumPlayer.playNowIfReady as ReturnType<typeof vi.fn>;
    expect(play).not.toHaveBeenCalled();
  });
});

describe('createChartDrumAudioPlayer single-context invariant (ADR 0025 step 1)', () => {
  beforeEach(() => {
    // Sample loads only need to resolve; the invariant under test is which context
    // the player ends up on, not what it decodes.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('borrows the passed context so drums and chords share ONE AudioContext', async () => {
    const sharedCtx = createMockAudioContext();
    const player = createChartDrumAudioPlayer(sharedCtx as unknown as AudioContext);
    await player.initialize();

    // The whole point of ADR 0025 step 1: the drum player must ride the chord
    // session's clock. A refactor that mints its own `new AudioContext()` (the
    // dual-clock regression this replaces) would return a different object here.
    expect(player.getAudioContext()).toBe(sharedCtx);
  });
});
