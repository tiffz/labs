import { describe, expect, it, vi } from 'vitest';
import { BaseInstrument } from './instrument';

class TestInstrument extends BaseInstrument {
  playNote(): void {
    // no-op
  }
}

function createMockAudioContext(): AudioContext {
  const createGain = () => {
    const gain = {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(function (this: { value: number }, value: number) {
        this.value = value;
      }),
      linearRampToValueAtTime: vi.fn(function (this: { value: number }, value: number) {
        this.value = value;
      }),
    };
    return {
      gain,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  };

  return {
    currentTime: 0,
    createGain,
  } as unknown as AudioContext;
}

describe('BaseInstrument.stopAll', () => {
  it('swaps to a fresh output bus so scheduled notes stay muted after stop', () => {
    const ctx = createMockAudioContext();
    const destination = ctx.createGain();
    const instrument = new TestInstrument(ctx);
    instrument.connect(destination);

    const outputBeforeStop = instrument.getOutput();
    instrument.stopAll(0);

    expect(instrument.getOutput()).not.toBe(outputBeforeStop);
    expect(outputBeforeStop.gain.value).toBe(0);
  });
});
