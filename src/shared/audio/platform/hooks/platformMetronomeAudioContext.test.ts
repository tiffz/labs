import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPlatformMetronomeAudioForTests,
  primePlatformMetronomeAudio,
} from './usePlatformMediaMetronome';

/**
 * One AudioContext per session, not one per play.
 *
 * `primePlatformMetronomeAudio` used to call `new AudioContext()` unconditionally and overwrite the
 * module-level reference, orphaning the previous context without closing it. It runs on the first
 * line of Stanza's `playUnified`, which also re-runs on every loop wrap and on premature-end
 * resume — so practising a looped section minted one context per pass. Browsers cap contexts per
 * document (~6) and then throw, after which the metronome and drums go silent for the rest of the
 * session while the `<audio>` element keeps playing. That presented as "drums are muted at the
 * start", intermittently, depending on how many times play had been pressed.
 */

class FakeAudioContext {
  static created = 0;
  state: AudioContextState = 'suspended';
  constructor() {
    FakeAudioContext.created += 1;
  }
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

beforeEach(() => {
  FakeAudioContext.created = 0;
  __resetPlatformMetronomeAudioForTests();
  vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetPlatformMetronomeAudioForTests();
});

describe('primePlatformMetronomeAudio', () => {
  it('creates exactly one AudioContext no matter how many times play is pressed', () => {
    primePlatformMetronomeAudio();
    expect(FakeAudioContext.created).toBe(1);

    // Twelve loop wraps — the old code produced twelve contexts and blew the browser cap.
    for (let i = 0; i < 12; i += 1) primePlatformMetronomeAudio();

    expect(FakeAudioContext.created).toBe(1);
  });

  it('resumes the existing context rather than replacing it', () => {
    primePlatformMetronomeAudio();
    const first = FakeAudioContext.created;
    primePlatformMetronomeAudio();
    expect(FakeAudioContext.created).toBe(first);
  });

  it('recreates only after the context has been closed', () => {
    primePlatformMetronomeAudio();
    expect(FakeAudioContext.created).toBe(1);

    // Simulate a teardown that closed the shared context.
    __resetPlatformMetronomeAudioForTests();
    primePlatformMetronomeAudio();

    expect(FakeAudioContext.created).toBe(2);
  });
});
