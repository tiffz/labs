import { afterEach, describe, expect, it, vi } from 'vitest';
import { PianoSynthesizer } from './instruments/pianoSynth';
import {
  __resetAudioDiagnosticsForTest,
  getAudioDiagnosticsSnapshot,
} from './audioDiagnostics';

/**
 * Bounded-voice invariant guard (ADR 0025: "active sources stay bounded over K loop
 * passes"). The long-play crash is voices/nodes accumulating across a seamless loop
 * that never stops. This drives the REAL default chord instrument (PianoSynthesizer)
 * through K loop passes of N notes each — scheduling a measure, then ending its notes
 * (as `onended` does in the browser) — and asserts the live-diagnostics voice count
 * never climbs unbounded and returns to baseline once notes end. An instrument that
 * forgot to release a tracked voice would make this grow with K and go red.
 *
 * Deterministic (mock clock + explicit onended) so it runs every CI with zero flake.
 * The browser `@soak` heap spec covers the real AudioContext end-to-end.
 */

type MockOsc = {
  type: string;
  frequency: { value: number; setValueAtTime: () => void; linearRampToValueAtTime: () => void; setTargetAtTime: () => void; cancelScheduledValues: () => void };
  detune: MockOsc['frequency'];
  connect: () => void;
  start: () => void;
  stop: () => void;
  onended: (() => void) | null;
};

function makeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

function createMockContext() {
  const liveOscillators: MockOsc[] = [];
  const ctx = {
    currentTime: 0,
    createGain: () => ({
      gain: makeParam(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createOscillator: () => {
      const o: MockOsc = {
        type: 'sine',
        frequency: makeParam(),
        detune: makeParam(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      liveOscillators.push(o);
      return o;
    },
  } as unknown as AudioContext;
  return { ctx, liveOscillators };
}

afterEach(() => __resetAudioDiagnosticsForTest());

describe('chord-instrument voices stay bounded over K loop passes', () => {
  it('does not accumulate voices across 200 loop passes (leak = monotonic growth)', () => {
    __resetAudioDiagnosticsForTest();
    const { ctx, liveOscillators } = createMockContext();
    const synth = new PianoSynthesizer(ctx);
    synth.connect(ctx.createGain() as unknown as AudioNode);

    const baseline = getAudioDiagnosticsSnapshot().voices;
    const NOTES_PER_MEASURE = 3; // a chord = a few simultaneous voices
    const PASSES = 200;
    let peak = baseline;

    for (let pass = 0; pass < PASSES; pass += 1) {
      // Schedule one measure's worth of chord notes on the current clock.
      for (let n = 0; n < NOTES_PER_MEASURE; n += 1) {
        synth.playNote({ frequency: 220 + n * 55, startTime: (ctx as { currentTime: number }).currentTime, duration: 0.5, velocity: 0.8 });
      }
      peak = Math.max(peak, getAudioDiagnosticsSnapshot().voices);

      // Advance the clock past the measure and end every scheduled note, exactly as
      // each source's `onended` does in the browser — this is what releases voices.
      (ctx as { currentTime: number }).currentTime += 0.5;
      const ended = liveOscillators.splice(0, liveOscillators.length);
      for (const osc of ended) osc.onended?.();

      // After a full loop pass's notes end, live voices must return to baseline —
      // never carry over and compound across passes.
      expect(getAudioDiagnosticsSnapshot().voices).toBe(baseline);
    }

    // The per-measure peak is bounded by ONE measure's voices (a piano note = a
    // fundamental + several harmonic oscillators), NOT K*measures. The real guard is
    // the per-pass `toBe(baseline)` above — this ceiling just documents that peak is a
    // per-measure constant, orders of magnitude below any K-scaled value (200*3).
    const PER_NOTE_VOICE_CEILING = 12; // generous headroom over the ~6 harmonics/note
    expect(peak).toBeLessThanOrEqual(baseline + NOTES_PER_MEASURE * PER_NOTE_VOICE_CEILING);
    expect(peak).toBeLessThan(PASSES); // the point: bounded per-measure, not growing with K
  });

  it('unregisters the instrument from diagnostics on dispose (no leaked instrument)', () => {
    __resetAudioDiagnosticsForTest();
    const { ctx } = createMockContext();
    const synth = new PianoSynthesizer(ctx);
    expect(getAudioDiagnosticsSnapshot().instruments).toBe(1);
    synth.dispose();
    expect(getAudioDiagnosticsSnapshot().instruments).toBe(0);
  });
});
