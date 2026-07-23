import { describe, expect, it, vi } from 'vitest';
import { BaseInstrument } from './instrument';

class TestInstrument extends BaseInstrument {
  playNote(): void {
    // no-op
  }

  registerVoice(stop: () => void): () => void {
    return this.trackVoice(stop);
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

  it('hard-stops tracked voices so long loops cannot accumulate AudioNodes', () => {
    const ctx = createMockAudioContext();
    const instrument = new TestInstrument(ctx);
    const stopA = vi.fn();
    const stopB = vi.fn();
    instrument.registerVoice(stopA);
    instrument.registerVoice(stopB);
    expect(instrument.activeVoiceCount).toBe(2);

    instrument.stopAll(0);

    expect(stopA).toHaveBeenCalledOnce();
    expect(stopB).toHaveBeenCalledOnce();
    expect(instrument.activeVoiceCount).toBe(0);
  });

  it('stops sources AT the bus-fade end, never at 0 (anti-click ordering)', () => {
    // Cutting an oscillator/sample mid-waveform while the gain is still audible
    // clicks. stopAll must ramp the bus to 0 first and stop each source at that
    // ramp-end time — so voice.stop is called with a positive time, not 0.
    const ctx = createMockAudioContext();
    const instrument = new TestInstrument(ctx);
    const stop = vi.fn();
    instrument.registerVoice(stop);

    instrument.stopAll(0); // even a 0ms request gets the minimum anti-click fade

    const stopAt = stop.mock.calls[0][0] as number;
    expect(stopAt).toBeGreaterThan(0);
    // The stop time equals the bus-gain ramp end (currentTime 0 + min fade).
    expect(stopAt).toBeCloseTo(0.012, 5);
  });
});
