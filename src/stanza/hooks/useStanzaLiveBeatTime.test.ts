// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStanzaLiveBeatTime } from './useStanzaLiveBeatTime';

/**
 * The drum highlight must follow the LIVE transport clock, not `playback.currentTime`.
 *
 * `playback.currentTime` is React state written from the media element's `timeupdate` event, which
 * fires at roughly 4 Hz. The drum scheduler reads the live clock every rAF. With two clocks the
 * highlight trails the audio by up to half a beat at 120 BPM — the owner's "drum highlight is not
 * synchronized with the audio, which makes it very hard to follow".
 */

let rafCallbacks: FrameRequestCallback[] = [];

function flushFrame(): void {
  const pending = rafCallbacks;
  rafCallbacks = [];
  for (const cb of pending) cb(0);
}

beforeEach(() => {
  rafCallbacks = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useStanzaLiveBeatTime', () => {
  it('tracks the live clock while playing, ignoring a stale 4 Hz snapshot', () => {
    let live = 0;
    const { result } = renderHook(() =>
      useStanzaLiveBeatTime({
        isPlaying: true,
        getTime: () => live,
        anchorMediaTime: 0,
        bpm: 120,
        // Deliberately stale, as `timeupdate` would be between its ~250 ms ticks.
        fallbackTime: 0,
      }),
    );

    live = 1.75;
    act(() => flushFrame());

    expect(result.current).toBeCloseTo(1.75, 5);
  });

  it('subtracts the anchor so the value is beat-relative', () => {
    let live = 10;
    const { result } = renderHook(() =>
      useStanzaLiveBeatTime({
        isPlaying: true,
        getTime: () => live,
        anchorMediaTime: 4,
        bpm: 120,
        fallbackTime: 0,
      }),
    );

    live = 12.5;
    act(() => flushFrame());

    expect(result.current).toBeCloseTo(8.5, 5);
  });

  it('only re-renders when the quantized subdivision changes', () => {
    // Sampling rAF at 60 Hz must not mean 60 React renders per second on a screen the owner
    // already finds slow. At 120 BPM in 16ths a step is 125 ms.
    let live = 0;
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useStanzaLiveBeatTime({
        isPlaying: true,
        getTime: () => live,
        anchorMediaTime: 0,
        bpm: 120,
        subdivisionsPerBeat: 4,
        fallbackTime: 0,
      });
    });

    // The first frame legitimately syncs once (the step cursor starts unset), so take the
    // baseline after it — the property under test is "no render WITHIN a step", not "never".
    act(() => flushFrame());
    const rendersAfterFirstSync = renders;

    // Advance 100 ms in 10 ms frames — all inside the same 125 ms step.
    for (let i = 1; i <= 10; i += 1) {
      live = i * 0.01;
      act(() => flushFrame());
    }
    expect(renders).toBe(rendersAfterFirstSync);

    // Cross into the next step.
    live = 0.13;
    act(() => flushFrame());
    expect(renders).toBeGreaterThan(rendersAfterFirstSync);
  });

  it('falls back to the snapshot when paused', () => {
    const { result } = renderHook(() =>
      useStanzaLiveBeatTime({
        isPlaying: false,
        getTime: () => 999,
        anchorMediaTime: 2,
        bpm: 120,
        fallbackTime: 7,
      }),
    );

    expect(result.current).toBeCloseTo(5, 5);
  });

  it('stops sampling after unmount', () => {
    const getTime = vi.fn(() => 1);
    const { unmount } = renderHook(() =>
      useStanzaLiveBeatTime({
        isPlaying: true,
        getTime,
        anchorMediaTime: 0,
        bpm: 120,
        fallbackTime: 0,
      }),
    );
    act(() => flushFrame());
    unmount();
    const callsAtUnmount = getTime.mock.calls.length;
    act(() => flushFrame());
    expect(getTime.mock.calls.length).toBe(callsAtUnmount);
  });
});
