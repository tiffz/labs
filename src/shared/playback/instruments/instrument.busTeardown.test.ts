import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInstrument } from './instrument';

/**
 * Bus-teardown leak guardrail. `stopAll` swaps in a fresh output bus and defers the
 * disconnect of the old one by one fade window. If two `stopAll`s land inside that
 * window (rapid Play/Stop, fast section switches, tab-visibility flips), each must
 * disconnect its OWN old bus. A single-slot timer let the second call cancel the
 * first teardown, orphaning that bus `GainNode` wired to `destination` forever —
 * one leaked node per rapid re-stop, unbounded over a long session.
 */

type MockParam = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
};

type MockGain = {
  gain: MockParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  __disconnected: boolean;
};

function makeParam(): MockParam {
  return {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

function createContext() {
  const gains: MockGain[] = [];
  const createGain = (): MockGain => {
    const g: MockGain = {
      gain: makeParam(),
      connect: vi.fn(),
      disconnect: vi.fn(() => {
        g.__disconnected = true;
      }),
      __disconnected: false,
    };
    gains.push(g);
    return g;
  };
  const ctx = { currentTime: 0, createGain } as unknown as AudioContext;
  return { ctx, gains };
}

/** Minimal concrete instrument — we only exercise BaseInstrument's bus lifecycle. */
class TestInstrument extends BaseInstrument {
  // Bus lifecycle is under test, not note synthesis — the impl may ignore params.
  playNote(): void {}
}

describe('BaseInstrument bus teardown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('disconnects every faded bus when two stopAll land in one fade window (no orphan)', () => {
    const { ctx } = createContext();
    const inst = new TestInstrument(ctx);
    const destination = ctx.createGain() as unknown as AudioNode;
    inst.connect(destination);

    const busAtStart = inst.getOutput() as unknown as MockGain;
    inst.stopAll(0); // fades busAtStart, swaps to bus #2, schedules teardown of #1
    const busAfterFirst = inst.getOutput() as unknown as MockGain;
    expect(busAfterFirst).not.toBe(busAtStart);
    inst.stopAll(0); // rapid second stop, well within the fade window

    expect(inst.pendingBusTeardownCount).toBe(2);
    vi.runAllTimers();

    // Both faded buses must be disconnected — the single-slot bug orphaned the first.
    expect(busAtStart.__disconnected, 'first faded bus orphaned (single-slot leak)').toBe(true);
    expect(busAfterFirst.__disconnected).toBe(true);
    expect(inst.pendingBusTeardownCount).toBe(0);
    // The live bus (created by the 2nd stopAll) must stay connected.
    expect((inst.getOutput() as unknown as MockGain).__disconnected).toBe(false);
  });

  it('dispose disconnects buses still awaiting a deferred teardown', () => {
    const { ctx } = createContext();
    const inst = new TestInstrument(ctx);
    inst.connect(ctx.createGain() as unknown as AudioNode);

    const faded = inst.getOutput() as unknown as MockGain;
    inst.stopAll(0);
    expect(inst.pendingBusTeardownCount).toBe(1);

    inst.dispose(); // must flush the pending teardown, not just cancel the timer
    expect(faded.__disconnected, 'pending faded bus orphaned on dispose').toBe(true);
    expect(inst.pendingBusTeardownCount).toBe(0);
  });
});
