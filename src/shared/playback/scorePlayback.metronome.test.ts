import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PianoScore } from '../music/scoreTypes';

const hoisted = vi.hoisted(() => {
  const resume = vi.fn().mockResolvedValue(undefined);
  let currentTime = 0;
  const fakeAudioContext = {
    get state() {
      return 'running' as AudioContextState;
    },
    get currentTime() {
      return currentTime;
    },
    set currentTime(value: number) {
      currentTime = value;
    },
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
  const playClickSampleAt = vi.fn();
  return { fakeAudioContext, playNote, playClickSampleAt, resume, primeAudioContext: vi.fn() };
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
  playClickSampleAt: hoisted.playClickSampleAt,
}));

import { ScorePlaybackEngine } from './scorePlayback';

const tripletMeasureScore: PianoScore = {
  id: 'triplet',
  title: 'Triplet measure',
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

describe('ScorePlaybackEngine subdivision metronome', () => {
  beforeEach(() => {
    hoisted.playClickSampleAt.mockClear();
    hoisted.fakeAudioContext.currentTime = 0;
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('schedules missed triplet clicks after a tab-gap note catch-up', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setMetronome(true);
    engine.setMetronomeClickMode('subdivision');
    engine.setMetronomeSubdivision('triplet');
    await engine.start(tripletMeasureScore, 'piano', () => {});

    const internal = engine as unknown as {
      tick: () => void;
      scheduledUpTo: number;
      metronomeScheduledUpTo: number;
      startTime: number;
    };

    internal.tick();
    hoisted.playClickSampleAt.mockClear();

    internal.scheduledUpTo = 0.9;
    internal.metronomeScheduledUpTo = 0.2;
    hoisted.fakeAudioContext.currentTime = internal.startTime + 0.55;
    internal.tick();

    expect(hoisted.playClickSampleAt.mock.calls.length).toBeGreaterThan(0);
    const earliestClick = Math.min(
      ...hoisted.playClickSampleAt.mock.calls.map(call => call[2] as number),
    );
    expect(earliestClick).toBeLessThan(internal.startTime + 0.9);

    engine.stop();
  });

  it('aborts an in-flight count-in when stop() is called', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setMetronomeClickMode('subdivision');
    engine.setMetronomeSubdivision('triplet');

    const countInPromise = engine.playCountIn(60, {
      clickMode: 'subdivision',
      subdivision: 'triplet',
    });
    engine.stop();
    await countInPromise;

    expect(hoisted.playClickSampleAt.mock.calls.length).toBeLessThan(12);
  });
});
