import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useStanzaTransportLoop, type UseStanzaTransportLoopRefs } from './useStanzaTransportLoop';

/**
 * Hook-level repro for "Stanza playback stops before the song finishes" — a Drive mp4 whose
 * `<video>` container `duration` (175s) is shorter than its decoded horizon (188.2s). The
 * element cannot seek past its own duration, so resuming on the analyzed horizon alone
 * re-clamps and re-fires `ended` forever. Drives two `ended` events through the real hook with
 * a transport tick in between (which is where the earlier fix wrongly cleared the guard) and
 * asserts the second `ended` does NOT resume: `playUnified` fires once, not repeatedly.
 */

const CONTAINER_DURATION = 175;
const DECODED_HORIZON = 188.2;

function makeHardEofMediaElement(duration: number): HTMLMediaElement {
  let currentTime = duration; // frozen at the element's hard EOF
  return {
    duration,
    paused: false,
    get currentTime() {
      return currentTime;
    },
    set currentTime(v: number) {
      // A media element clamps seeks to its own duration — it will not advance past EOF.
      currentTime = Math.min(v, duration);
    },
    seekable: { length: 1, end: () => duration },
    buffered: { length: 1, end: () => duration },
    play: () => Promise.resolve(),
    pause: () => {},
  } as unknown as HTMLMediaElement;
}

function ref<T>(value: T) {
  return { current: value };
}

function buildRefs(el: HTMLMediaElement, playUnified: () => void): UseStanzaTransportLoopRefs {
  return {
    playingRef: ref(true),
    timeRef: ref(CONTAINER_DURATION),
    durationRef: ref(CONTAINER_DURATION),
    knownHorizonSecRef: ref(DECODED_HORIZON),
    loopModeRef: ref('through' as const),
    effectiveSelectionSpanRef: ref(null),
    segmentsRef: ref([]),
    skippedBySegmentIdRef: ref({}),
    hasAnySkippedSectionRef: ref(false),
    isYoutubeRef: ref(false),
    lastUserEnteredSectionIdRef: ref(null),
    seekUnifiedRef: ref((t: number) => {
      el.currentTime = t;
    }),
    playUnifiedRef: ref(playUnified),
    pauseStemAudiosRef: ref(() => {}),
    ytControllerRef: ref(null),
    transposeMirrorStopRef: ref(() => {}),
    transposeStemBusStopRef: ref(() => {}),
  } as unknown as UseStanzaTransportLoopRefs;
}

describe('useStanzaTransportLoop — premature-end resume guard (hook level)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not re-resume a hard-EOF element after a transport tick between two `ended` events', () => {
    vi.useFakeTimers();
    const el = makeHardEofMediaElement(CONTAINER_DURATION);
    const playUnified = vi.fn();
    const refs = buildRefs(el, playUnified);

    const { result, unmount } = renderHook(() =>
      useStanzaTransportLoop({
        refsRef: ref(refs),
        readLiveTransportTime: () => el.currentTime,
        getLocalMainMedia: () => el,
        setPlayback: vi.fn(),
      }),
    );

    // `ended` #1 — element at its hard EOF, longer decoded horizon known. Resume optimistically.
    act(() => {
      result.current.handleLocalMediaEnded();
    });
    // The resume schedules `playUnified` on the next frame; a transport tick also runs there.
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(playUnified).toHaveBeenCalledTimes(1);

    // `ended` #2 — the element clamped the seek back to EOF and re-fired `ended` without
    // advancing. The guard must stop, not resume again.
    act(() => {
      result.current.handleLocalMediaEnded();
    });
    act(() => {
      vi.advanceTimersToNextFrame();
    });

    // Fixed: still one resume. Broken (guard cleared mid-tick): two.
    expect(playUnified).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('clears the stale guard on a media-source swap so a new song still resumes', () => {
    vi.useFakeTimers();
    const el1 = makeHardEofMediaElement(CONTAINER_DURATION); // EOF 175, horizon 188.2
    const el2 = makeHardEofMediaElement(176); // a different song, EOF 176
    let activeEl = el1;
    const playUnified = vi.fn();
    const refs = buildRefs(el1, playUnified);

    const { result, unmount } = renderHook(() =>
      useStanzaTransportLoop({
        refsRef: ref(refs),
        readLiveTransportTime: () => activeEl.currentTime,
        getLocalMainMedia: () => activeEl,
        setPlayback: vi.fn(),
      }),
    );

    // Song A's hard EOF sets the guard target near 175 (and stops on the second `ended`).
    act(() => {
      result.current.handleLocalMediaEnded();
    });
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(playUnified).toHaveBeenCalledTimes(1);

    // Swap to Song B (a new element). Its EOF (176) is within the stall window of the old
    // target, so only the element-identity reset — not motion — can clear the stale guard.
    activeEl = el2;
    refs.knownHorizonSecRef.current = 185;
    refs.durationRef.current = 176;
    refs.timeRef.current = 176;
    act(() => {
      vi.advanceTimersToNextFrame(); // tick sees the new element and clears the stale target
    });

    // Song B ends prematurely at its own EOF with a longer known horizon — must resume.
    act(() => {
      result.current.handleLocalMediaEnded();
    });
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(playUnified).toHaveBeenCalledTimes(2);

    unmount();
  });
});
