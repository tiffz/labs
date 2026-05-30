import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PianoScore } from '../music/scoreTypes';

const hoisted = vi.hoisted(() => {
  const resume = vi.fn().mockResolvedValue(undefined);
  const fakeAudioContext = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    destination: {},
    resume,
    createDynamicsCompressor: () => ({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    }),
  };
  const playNote = vi.fn();
  return { fakeAudioContext, playNote, resume, primeAudioContext: vi.fn() };
});

vi.mock('./audioContextLifecycle', () => ({
  createManagedAudioContext: vi.fn(() => ({ context: hoisted.fakeAudioContext })),
  ensureAudioContextRunning: vi.fn(async () => hoisted.fakeAudioContext.state === 'running'),
  primeAudioContext: hoisted.primeAudioContext,
}));

vi.mock('./instrumentFactory', () => ({
  createInstrumentForSoundType: vi.fn(() => ({
    playNote: hoisted.playNote,
    stopAll: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock('../audio/clickService', () => ({
  loadClickSample: vi.fn(async () => ({})),
  playClickSampleAt: vi.fn(),
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
      measures: [{ notes: [{ id: 'n0', pitches: [60], duration: 'whole' }] }],
    },
  ],
};

describe('ScorePlaybackEngine audio regression guards', () => {
  beforeEach(() => {
    hoisted.playNote.mockClear();
    hoisted.primeAudioContext.mockClear();
    hoisted.fakeAudioContext.state = 'running';
    hoisted.fakeAudioContext.currentTime = 0;
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('primes the audio context synchronously before awaited setup', () => {
    const engine = new ScorePlaybackEngine();
    engine.primeAudioContext();
    expect(hoisted.primeAudioContext).toHaveBeenCalledWith(hoisted.fakeAudioContext);
  });

  it('schedules at least one note when the audio context is running', async () => {
    const engine = new ScorePlaybackEngine();
    await engine.start(oneMeasureScore, 'piano', () => {});

    (engine as unknown as { tick: () => void }).tick();

    expect(hoisted.playNote).toHaveBeenCalled();
    engine.stop();
  });

  it('does not schedule notes when the audio context never reaches running', async () => {
    hoisted.fakeAudioContext.state = 'suspended';
    const engine = new ScorePlaybackEngine();
    await engine.start(oneMeasureScore, 'piano', () => {});

    expect(hoisted.playNote).not.toHaveBeenCalled();
    engine.stop();
  });
});
