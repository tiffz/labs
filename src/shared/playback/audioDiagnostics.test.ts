import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetAudioDiagnosticsForTest,
  getAudioDiagnosticsSnapshot,
  registerDiagnosticInstrument,
  registerDiagnosticScheduler,
  type AudioSchedulerSource,
  type AudioVoiceSource,
} from './audioDiagnostics';

afterEach(() => __resetAudioDiagnosticsForTest());

function fakeInstrument(voices: number, buses = 0): AudioVoiceSource {
  return { activeVoiceCount: voices, pendingBusTeardownCount: buses };
}
function fakeScheduler(sources: number, callbacks = 0): AudioSchedulerSource {
  return { activeSourceCount: sources, pendingCallbackCount: callbacks };
}

describe('audio diagnostics registry', () => {
  it('sums live voices/sources across every registered source', () => {
    registerDiagnosticInstrument(fakeInstrument(3, 1));
    registerDiagnosticInstrument(fakeInstrument(2, 0));
    registerDiagnosticScheduler(fakeScheduler(4, 5));

    const snap = getAudioDiagnosticsSnapshot();
    expect(snap.voices).toBe(5);
    expect(snap.buses).toBe(1);
    expect(snap.sources).toBe(4);
    expect(snap.callbacks).toBe(5);
    expect(snap.instruments).toBe(2);
    expect(snap.schedulers).toBe(1);
  });

  it('drops a source from the snapshot once it unregisters (no leak of dead sources)', () => {
    const unregister = registerDiagnosticInstrument(fakeInstrument(9));
    expect(getAudioDiagnosticsSnapshot().voices).toBe(9);
    unregister();
    const snap = getAudioDiagnosticsSnapshot();
    expect(snap.voices).toBe(0);
    expect(snap.instruments).toBe(0);
  });

  it('stays bounded when N sessions each register then unregister (K-loop invariant)', () => {
    // Simulates opening/closing playback K times: each registers and cleans up, so the
    // registry never grows unbounded. A session that forgot to unregister would show
    // instruments climbing — the exact leak signal the overlay/soak watch for.
    for (let i = 0; i < 200; i += 1) {
      const off = registerDiagnosticInstrument(fakeInstrument(1));
      off();
    }
    expect(getAudioDiagnosticsSnapshot().instruments).toBe(0);
  });
});
