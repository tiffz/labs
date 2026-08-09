import { describe, expect, it, vi } from 'vitest';
import { BaseInstrument } from './instrument';

/**
 * Exercises the loop-wrap voice choke (ADR 0025 step 3). A test instrument whose
 * voices "ring" until their scheduled stop time, and release on stop, so we can drive
 * many loop passes and assert the tracked-voice count stays bounded.
 */
class ChokeTestInstrument extends BaseInstrument {
  playNote(): void {
    // no-op
  }

  /**
   * Register one voice. Returns a `fireEnded()` that simulates the source ending at
   * its scheduled stop time (which calls `release()` — the real onended contract).
   */
  addVoice(): { fireEnded: () => void; stoppedAt: () => number | undefined } {
    let stoppedAt: number | undefined;
    const release = this.trackVoice((when) => {
      stoppedAt = when;
    });
    return {
      fireEnded: () => release(),
      stoppedAt: () => stoppedAt,
    };
  }
}

function createMockAudioContext(): AudioContext {
  const createGain = () => ({
    gain: {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  return { currentTime: 0, createGain } as unknown as AudioContext;
}

describe('BaseInstrument.stopAllVoicesAt — wrap-time voice choke', () => {
  it('schedules every tracked voice to stop AT the wrap boundary', () => {
    const instrument = new ChokeTestInstrument(createMockAudioContext());
    const a = instrument.addVoice();
    const b = instrument.addVoice();

    instrument.stopAllVoicesAt(12.5);

    expect(a.stoppedAt()).toBe(12.5);
    expect(b.stoppedAt()).toBe(12.5);
    // Voices stay tracked until their onended release fires at the boundary.
    expect(instrument.activeVoiceCount).toBe(2);
    a.fireEnded();
    b.fireEnded();
    expect(instrument.activeVoiceCount).toBe(0);
  });

  it('keeps the live-voice count bounded across many loop wraps', () => {
    const instrument = new ChokeTestInstrument(createMockAudioContext());
    const VOICES_PER_PASS = 20;
    const PASSES = 200;
    let peak = 0;
    let previousPass: Array<{ fireEnded: () => void }> = [];

    for (let pass = 0; pass < PASSES; pass += 1) {
      // Schedule this pass's voices (as the look-ahead does).
      const thisPass = Array.from({ length: VOICES_PER_PASS }, () => instrument.addVoice());
      peak = Math.max(peak, instrument.activeVoiceCount);

      // At the wrap: choke the still-ringing PREVIOUS pass at the boundary, then let
      // those voices reach their stop (onended release) — exactly the hook's order.
      instrument.stopAllVoicesAt(pass + 1);
      for (const voice of previousPass) voice.fireEnded();

      previousPass = thisPass;
    }

    // Without a choke, voices would grow ~linearly with PASSES (thousands). With it,
    // at most ~2 passes are ever live at once.
    expect(peak).toBeLessThanOrEqual(VOICES_PER_PASS * 2);
    expect(instrument.activeVoiceCount).toBeLessThanOrEqual(VOICES_PER_PASS);
  });

  it('is a no-op after dispose', () => {
    const instrument = new ChokeTestInstrument(createMockAudioContext());
    const a = instrument.addVoice();
    instrument.dispose();
    instrument.stopAllVoicesAt(5);
    expect(a.stoppedAt()).toBeUndefined();
  });
});
