// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * One AudioContext for the whole session, not one per loop wrap.
 *
 * Stanza held its drum scheduler in a `useMemo` keyed on bpm / anchor / isPlaying with no cleanup,
 * and `createMediaTimelineDrumScheduler` mints an `AudioPlayer` and therefore an `AudioContext`.
 * `isPlaying` flips on every play and pause and the anchor changes at every section boundary, so
 * looping a section leaked one context plus a full set of decoded samples per wrap, never released.
 * Browsers cap contexts per document and then throw — the "crashes after a while of looping"
 * report, and the same shape as the Encore playback OOM behind ADR 0025.
 */

const created: FakeCtx[] = [];

class FakeCtx {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  constructor() {
    created.push(this);
  }
  createGain = vi.fn(() => ({ connect: vi.fn(), gain: { value: 1, setValueAtTime: vi.fn() } }));
  createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() }));
  decodeAudioData = vi.fn(async () => ({ duration: 1 }));
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

beforeEach(() => {
  created.length = 0;
  vi.stubGlobal('AudioContext', FakeCtx as unknown as typeof AudioContext);
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('media-timeline drum scheduler lifetime', () => {
  it('retuning tempo, anchor and play state never mints a second AudioContext', async () => {
    const { createMediaTimelineDrumScheduler } = await import('./useMediaTimelineDrumScheduler');

    // The options object is mutated in place, exactly as StanzaWorkspace does.
    const opts = {
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 } as const,
      anchorMediaTime: 0,
      getMediaTime: () => 0,
      isPlaying: false,
    };
    const scheduler = createMediaTimelineDrumScheduler(opts);
    const afterCreate = created.length;

    // 20 loop wraps: each one flips play state and moves the section anchor.
    for (let i = 0; i < 20; i += 1) {
      opts.isPlaying = true;
      opts.anchorMediaTime = i * 4;
      opts.bpm = 120 + (i % 3);
      scheduler.syncPlayback();
      opts.isPlaying = false;
      scheduler.syncPlayback();
    }

    expect(created.length).toBe(afterCreate);
    expect(created.length).toBeLessThanOrEqual(1);
  });

  it('destroy() releases the context so a session can be torn down', async () => {
    const { createMediaTimelineDrumScheduler } = await import('./useMediaTimelineDrumScheduler');
    const scheduler = createMediaTimelineDrumScheduler({
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      anchorMediaTime: 0,
      getMediaTime: () => 0,
      isPlaying: true,
    });
    expect(typeof scheduler.destroy).toBe('function');
    expect(() => scheduler.destroy()).not.toThrow();
  });
});
