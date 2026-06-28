import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PianoScore } from '../music/scoreTypes';
import { clearExpectedTimes, getNoteExpectedTime } from '../practice/practiceTimingStore';

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

const pentascaleScore: PianoScore = {
  id: 'pentascale',
  title: 'Pentascale',
  key: 'F',
  tempo: 72,
  timeSignature: { numerator: 4, denominator: 4 },
  parts: [
    {
      id: 'rh',
      name: 'Right Hand',
      clef: 'treble',
      hand: 'right',
      measures: [
        {
          notes: [
            { id: 'n0', pitches: [65], duration: 'quarter' },
            { id: 'n1', pitches: [67], duration: 'quarter' },
            { id: 'n2', pitches: [69], duration: 'quarter' },
            { id: 'n3', pitches: [70], duration: 'quarter' },
            { id: 'n4', pitches: [72], duration: 'quarter' },
          ],
        },
        {
          notes: [
            { id: 'n5', pitches: [70], duration: 'quarter' },
            { id: 'n6', pitches: [69], duration: 'quarter' },
            { id: 'n7', pitches: [67], duration: 'quarter' },
            { id: 'n8', pitches: [65], duration: 'half' },
          ],
        },
      ],
    },
    {
      id: 'lh',
      name: 'Left Hand',
      clef: 'bass',
      hand: 'left',
      measures: [
        {
          notes: [
            { id: 'n9', pitches: [41], duration: 'quarter' },
            { id: 'n10', pitches: [43], duration: 'quarter' },
            { id: 'n11', pitches: [45], duration: 'quarter' },
            { id: 'n12', pitches: [46], duration: 'quarter' },
            { id: 'n13', pitches: [48], duration: 'quarter' },
          ],
        },
        {
          notes: [
            { id: 'n14', pitches: [46], duration: 'quarter' },
            { id: 'n15', pitches: [45], duration: 'quarter' },
            { id: 'n16', pitches: [43], duration: 'quarter' },
            { id: 'n17', pitches: [41], duration: 'half' },
          ],
        },
      ],
    },
  ],
};

describe('ScorePlaybackEngine subdivision metronome', () => {
  beforeEach(() => {
    hoisted.playClickSampleAt.mockClear();
    hoisted.fakeAudioContext.currentTime = 0;
    clearExpectedTimes();
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('pre-schedules every quarter click at start for fixed tempo beat mode', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setTempo(72);
    engine.setMetronome(true);
    engine.setMetronomeClickMode('beat');
    await engine.start(pentascaleScore, 'piano', () => {});

    const internal = engine as unknown as {
      startTime: number;
      totalBeats: number;
    };
    const secPerBeat = 60 / 72;
    const expectedClicks = Math.floor(internal.totalBeats);

    expect(hoisted.playClickSampleAt.mock.calls.length).toBe(expectedClicks);

    const scheduledTimes = hoisted.playClickSampleAt.mock.calls.map(call => call[2] as number);
    for (let beat = 0; beat < expectedClicks; beat++) {
      const nominal = internal.startTime + beat * secPerBeat;
      const match = scheduledTimes.some(t => Math.abs(t - nominal) < 0.01);
      expect(match).toBe(true);
    }

    engine.stop();
  });

  it('does not collapse catch-up quarter clicks after a tab-gap simulation', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setTempo(72);
    engine.setMetronome(true);
    engine.setMetronomeClickMode('beat');
    engine.setSmartBeatMap({
      timeToBeat: (elapsed: number) => elapsed * (72 / 60),
      beatToTime: (beat: number) => beat * (60 / 72),
    });
    await engine.start(pentascaleScore, 'piano', () => {});

    const internal = engine as unknown as {
      tick: () => void;
      scheduledClickBeatKeys: Set<number>;
      startTime: number;
    };

    internal.tick();
    hoisted.playClickSampleAt.mockClear();
    internal.scheduledClickBeatKeys.clear();

    const secPerBeat = 60 / 72;
    hoisted.fakeAudioContext.currentTime = internal.startTime + secPerBeat * 2.5;
    internal.tick();

    const scheduledTimes = hoisted.playClickSampleAt.mock.calls.map(call => call[2] as number);
    expect(scheduledTimes.length).toBeGreaterThanOrEqual(2);
    const uniqueTimes = new Set(scheduledTimes.map(t => Math.round(t * 1000)));
    expect(uniqueTimes.size).toBeGreaterThanOrEqual(2);

    engine.stop();
  });

  it('records expected note times at beat onset when notes are scheduled', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setTempo(72);
    await engine.start(pentascaleScore, 'piano', () => {});

    const internal = engine as unknown as { tick: () => void };
    internal.tick();

    const expectedN0 = getNoteExpectedTime('n0');
    expect(expectedN0).toBeDefined();
    const expectedN1 = getNoteExpectedTime('n1');
    expect(expectedN1).toBeDefined();
    expect(expectedN1! - expectedN0!).toBeCloseTo((60 / 72) * 1000, -1);

    engine.stop();
  });

  it('schedules missed triplet clicks after a tab-gap note catch-up (variable tempo path)', async () => {
    const engine = new ScorePlaybackEngine();
    engine.setMetronome(true);
    engine.setMetronomeClickMode('subdivision');
    engine.setMetronomeSubdivision('triplet');
    engine.setSmartBeatMap({
      timeToBeat: (elapsed: number) => elapsed,
      beatToTime: (beat: number) => beat,
    });
    await engine.start(tripletMeasureScore, 'piano', () => {});

    const internal = engine as unknown as {
      tick: () => void;
      scheduledUpTo: number;
      metronomeScheduledUpTo: number;
      scheduledClickBeatKeys: Set<number>;
      startTime: number;
    };

    internal.tick();
    hoisted.playClickSampleAt.mockClear();

    internal.scheduledUpTo = 0.9;
    internal.metronomeScheduledUpTo = 0.2;
    internal.scheduledClickBeatKeys.clear();
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
