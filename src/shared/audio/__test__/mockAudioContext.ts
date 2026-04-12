import { vi } from 'vitest';

/** Minimal mock GainNode with spied AudioParam. */
export function createMockGainNode() {
  const gain = {
    value: 1,
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    setTargetAtTime: vi.fn().mockReturnThis(),
    cancelScheduledValues: vi.fn().mockReturnThis(),
  };
  return {
    gain,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

/** Minimal mock AudioBufferSourceNode. */
export function createMockSourceNode() {
  const source: Record<string, unknown> = {
    buffer: null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as ((ev: Event) => void) | null,
  };

  /** Simulate the source ending (fires onended). */
  (source as { _end: () => void })._end = () => {
    if (typeof source.onended === 'function') {
      (source.onended as (ev: Event) => void)(new Event('ended'));
    }
  };

  return source as unknown as AudioBufferSourceNode & { _end: () => void };
}

export interface MockAudioContext {
  _time: number;
  currentTime: number;
  state: AudioContextState;
  destination: AudioDestinationNode;
  createGain: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  decodeAudioData: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  _sources: Array<AudioBufferSourceNode & { _end: () => void }>;
  _gains: Array<ReturnType<typeof createMockGainNode>>;
}

/**
 * Create a fake AudioContext with controllable time.
 * Advance time by setting `ctx._time = 1.5`.
 */
export function createMockAudioContext(): MockAudioContext {
  const sources: Array<AudioBufferSourceNode & { _end: () => void }> = [];
  const gains: Array<ReturnType<typeof createMockGainNode>> = [];

  const ctx: MockAudioContext = {
    _time: 0,
    get currentTime() { return this._time; },
    state: 'running' as AudioContextState,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => {
      const g = createMockGainNode();
      gains.push(g);
      return g;
    }),
    createBufferSource: vi.fn(() => {
      const s = createMockSourceNode();
      sources.push(s);
      return s;
    }),
    decodeAudioData: vi.fn(async () => ({
      duration: 0.5,
      length: 24000,
      sampleRate: 48000,
      numberOfChannels: 1,
      getChannelData: vi.fn(() => new Float32Array(24000)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer)),
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    _sources: sources,
    _gains: gains,
  };

  return ctx;
}
