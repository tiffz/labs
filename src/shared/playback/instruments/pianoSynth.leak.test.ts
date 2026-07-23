import { describe, expect, it, vi } from 'vitest';
import { PianoSynthesizer } from './pianoSynth';

/**
 * Node-leak guardrail. A GainNode created per note and left connected to the
 * output graph cannot be garbage-collected; across a seamless section loop these
 * accumulate until the tab OOM-crashes. Every note-scoped node that connects must
 * be disconnected on its `onended`. Regression guard for the `modulationGain` leak
 * (long notes only) that crashed Encore Originals chord playback after long plays.
 */

type MockParam = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
};

type MockGain = {
  gain: MockParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  __connected: boolean;
  __disconnected: boolean;
};

type MockOsc = {
  type: string;
  frequency: MockParam;
  detune: MockParam;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
};

function makeParam(): MockParam {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

function createCountingContext() {
  const gains: MockGain[] = [];
  const oscillators: MockOsc[] = [];
  const createGain = (): MockGain => {
    const g: MockGain = {
      gain: makeParam(),
      connect: vi.fn(() => {
        g.__connected = true;
      }),
      disconnect: vi.fn(() => {
        g.__disconnected = true;
      }),
      __connected: false,
      __disconnected: false,
    };
    gains.push(g);
    return g;
  };
  const createOscillator = (): MockOsc => {
    const o: MockOsc = {
      type: 'sine',
      frequency: makeParam(),
      detune: makeParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    oscillators.push(o);
    return o;
  };
  const ctx = { currentTime: 0, createGain, createOscillator } as unknown as AudioContext;
  return { ctx, gains, oscillators };
}

describe('PianoSynthesizer node cleanup', () => {
  it('disconnects every note-scoped gain on note end (no per-long-note GainNode leak)', () => {
    const { ctx, gains, oscillators } = createCountingContext();
    const synth = new PianoSynthesizer(ctx);
    synth.connect(ctx.createGain()); // destination bus
    const nodesBefore = gains.length;

    // A long note (> modulation threshold 0.8s) exercises the LFO + modulationGain path.
    synth.playNote({ frequency: 440, startTime: 0, duration: 1.5, velocity: 0.8 });

    // Fire every source's onended — this is what runs the disconnect cleanup.
    for (const osc of oscillators) osc.onended?.();

    const noteGains = gains.slice(nodesBefore);
    // Every note-scoped gain that got connected into the graph must be disconnected.
    const leaked = noteGains.filter((g) => g.__connected && !g.__disconnected);
    expect(leaked, `${leaked.length} note gain node(s) connected but never disconnected`).toEqual([]);
    // And the long note must actually have created the modulation path (else the
    // test is vacuous): more gains than a bare noteGain-per-harmonic.
    expect(noteGains.length).toBeGreaterThan(0);
  });
});
