import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MetronomeConfig, BeatEvent } from './types';
import { createMockAudioContext } from '../../shared/audio/__test__/mockAudioContext';
import type { MockAudioContext } from '../../shared/audio/__test__/mockAudioContext';

const fakeBuffer = {
  duration: 0.3,
  length: 14400,
  sampleRate: 48000,
  numberOfChannels: 1,
  getChannelData: vi.fn(),
  copyFromChannel: vi.fn(),
  copyToChannel: vi.fn(),
};

vi.mock('./voicePackLoader', () => {
  return {
    VoicePackLoader: class {
      load = vi.fn(async () => {});
      getSample = vi.fn(() => fakeBuffer);
      isLoaded = vi.fn(() => true);
    },
  };
});

vi.mock('../../shared/audio/clickService', () => ({
  loadClickSample: vi.fn(async () => ({ buffer: fakeBuffer })),
}));

let mockCtx: MockAudioContext;

vi.stubGlobal('AudioContext', function () { return mockCtx; });

vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ version: 1, voice: 'test', sampleRate: 48000, samples: [] }),
  arrayBuffer: async () => new ArrayBuffer(100),
})));

const { MetronomeEngine } = await import('./MetronomeEngine');

function defaultConfig(overrides?: Partial<MetronomeConfig>): MetronomeConfig {
  return {
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    volumes: { accent: 1, quarter: 0.8, eighth: 0.6, sixteenth: 0 },
    voiceGain: 1,
    clickGain: 0.5,
    drumGain: 0,
    voiceMode: 'counting',
    subdivisionLevel: 2,
    ...overrides,
  };
}

describe('MetronomeEngine', () => {
  let engine: InstanceType<typeof MetronomeEngine>;
  let rafCallbacks: Array<() => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCtx = createMockAudioContext();
    mockCtx._time = 0;
    mockCtx.state = 'running';

    rafCallbacks = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = window.setTimeout(() => {
        rafCallbacks.push(cb as unknown as () => void);
      }, 16);
      return id as unknown as number;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id);
    });

    engine = new MetronomeEngine();
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function pumpRAF(frames = 1) {
    for (let i = 0; i < frames; i++) {
      vi.advanceTimersByTime(17);
      for (const cb of rafCallbacks) cb();
      rafCallbacks = [];
    }
  }

  // ---------------------------------------------------------------------------
  // Start / stop lifecycle
  // ---------------------------------------------------------------------------
  describe('start/stop lifecycle', () => {
    it('creates audio sources when started', async () => {
      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.05;
      pumpRAF(2);

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('stop prevents further scheduling', async () => {
      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.05;
      pumpRAF(1);

      const sourcesBeforeStop = mockCtx._sources.length;

      engine.stop();
      mockCtx._time = 0.5;
      pumpRAF(5);

      expect(mockCtx._sources.length).toBe(sourcesBeforeStop);
    });

    it('stop calls .stop() on tracked audio sources', async () => {
      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.05;
      pumpRAF(2);

      const startedSources = mockCtx._sources.filter(
        (s) => (s.start as ReturnType<typeof vi.fn>).mock.calls.length > 0
      );
      expect(startedSources.length).toBeGreaterThan(0);

      engine.stop();

      for (const s of startedSources) {
        expect(s.stop).toHaveBeenCalled();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Async race: start then immediately stop before loading completes
  // ---------------------------------------------------------------------------
  describe('async race protection', () => {
    it('does not begin playing if stopped during loading', async () => {
      const startPromise = engine.start(defaultConfig());
      engine.stop();

      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.5;
      pumpRAF(5);

      const startedSources = mockCtx._sources.filter(
        (s) => (s.start as ReturnType<typeof vi.fn>).mock.calls.length > 0
      );
      expect(startedSources.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Beat callback
  // ---------------------------------------------------------------------------
  describe('beat callback', () => {
    it('fires onBeat for each scheduled beat', async () => {
      const events: BeatEvent[] = [];
      engine.onBeat((evt: BeatEvent) => events.push(evt));

      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.06;
      pumpRAF(1);

      vi.advanceTimersByTime(300);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].beatIndex).toBe(0);
      expect(events[0].measure).toBe(0);
    });

    it('stop clears pending beat callbacks', async () => {
      const events: BeatEvent[] = [];
      engine.onBeat((evt: BeatEvent) => events.push(evt));

      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.06;
      pumpRAF(1);

      engine.stop();
      const countAfterStop = events.length;

      vi.advanceTimersByTime(1000);
      expect(events.length).toBe(countAfterStop);
    });
  });

  // ---------------------------------------------------------------------------
  // Gain ramp-down on stop
  // ---------------------------------------------------------------------------
  describe('gain ramp-down', () => {
    it('ramps master gain nodes to 0 on stop', async () => {
      const startPromise = engine.start(defaultConfig());
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.1;
      pumpRAF(1);

      engine.stop();

      const gainNodes = mockCtx._gains;
      const rampedNodes = gainNodes.filter(
        (g) => (g.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>).mock.calls.length > 0
      );
      expect(rampedNodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Timing accuracy
  // ---------------------------------------------------------------------------
  describe('timing', () => {
    it('schedules subdivisions at correct intervals for 120 BPM ÷2', async () => {
      const config = defaultConfig({
        bpm: 120,
        subdivisionLevel: 2,
        clickGain: 1,
        voiceGain: 0,
        drumGain: 0,
      });

      const startPromise = engine.start(config);
      await vi.runAllTimersAsync();
      await startPromise;

      mockCtx._time = 0.06;
      pumpRAF(3);

      const startCalls = mockCtx._sources
        .map((s) => (s.start as ReturnType<typeof vi.fn>).mock.calls)
        .flat()
        .map((args) => args[0] as number)
        .filter((t) => t !== undefined)
        .sort((a, b) => a - b);

      expect(startCalls.length).toBeGreaterThan(1);

      const expectedInterval = 0.25;
      for (let i = 1; i < Math.min(startCalls.length, 5); i++) {
        const diff = startCalls[i] - startCalls[i - 1];
        expect(diff).toBeCloseTo(expectedInterval, 1);
      }
    });
  });
});
