import { describe, expect, it, vi } from 'vitest';
import { scheduleDrumMeasure } from './scheduleDrumMeasure';
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
});
