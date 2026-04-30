import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PianoScore } from '../types';

const hoisted = vi.hoisted(() => {
  const audioParam = () => ({ value: 0 });
  const fakeAudioContext = {
    currentTime: 0,
    destination: {},
    createDynamicsCompressor: () => ({
      threshold: audioParam(),
      knee: audioParam(),
      ratio: audioParam(),
      attack: audioParam(),
      release: audioParam(),
      connect: vi.fn(),
    }),
    createOscillator: () => ({
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
    }),
  };

  return {
    fakeAudioContext,
    playClickSpy: vi.fn(),
  };
});

vi.mock('../../shared/playback/audioContextLifecycle', () => ({
  createManagedAudioContext: vi.fn(() => ({ context: hoisted.fakeAudioContext })),
  ensureAudioContextRunning: vi.fn(async () => {}),
}));
vi.mock('../../shared/playback/instrumentFactory', () => ({
  createInstrumentForSoundType: vi.fn(() => ({
    playNote: vi.fn(),
    stopAll: vi.fn(),
    disconnect: vi.fn(),
  })),
}));
vi.mock('../../shared/audio/clickService', () => ({
  loadClickSample: vi.fn(async () => ({})),
  playClickSampleAt: hoisted.playClickSpy,
}));

import { ScorePlaybackEngine } from './scorePlayback';

const oneMeasureScore: PianoScore = {
  id: 'score-1',
  title: 'One Measure',
  key: 'C',
  tempo: 60,
  timeSignature: { numerator: 4, denominator: 4 },
  parts: [
    {
      id: 'rh',
      name: 'Right Hand',
      clef: 'treble',
      hand: 'right',
      measures: [
        {
          notes: [{ id: 'n0', pitches: [60], duration: 'whole' }],
        },
      ],
    },
  ],
};

describe('ScorePlaybackEngine metronome scheduling', () => {
  beforeEach(() => {
    hoisted.playClickSpy.mockClear();
    hoisted.fakeAudioContext.currentTime = 0;
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('does not schedule click at or beyond score end', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setTempo(60);
    engine.setMetronome(true);

    await engine.start(oneMeasureScore, 'piano', () => {});

    (engine as unknown as { scheduledUpTo: number }).scheduledUpTo = 2.9;
    (engine as unknown as { scheduledClickTimes: Set<number> }).scheduledClickTimes.clear();
    (engine as unknown as { lastClickAudioTime: number }).lastClickAudioTime = -1;
    hoisted.fakeAudioContext.currentTime = 3.9;

    (engine as unknown as { tick: () => void }).tick();

    const scheduledTimes = hoisted.playClickSpy.mock.calls.map((call) => call[2] as number);
    // Nominal beat-3 click would be at t=3, but clickService clamps to currentTime+ε
    // when the clock has already passed that instant (real tab-throttle behavior).
    expect(scheduledTimes.some((time) => time >= 3 && time < 4)).toBe(true);
    expect(scheduledTimes.some((time) => time >= 4)).toBe(false);

    engine.stop();
  });
});
