// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { BpmControl } from './BpmControl';

/**
 * A HELD BUTTON MUST NOT KEEP COUNTING AFTER THE GESTURE ENDS.
 *
 * `useRepeatPress` starts an 80ms interval when you hold +1 or −1. It used to
 * stop on `pointerup` and `pointerleave` only — and a browser fires neither
 * when it takes a gesture over. It fires `pointercancel`: a touch that becomes
 * a scroll, a pointer whose element is removed or moves out from under it, a
 * system gesture.
 *
 * Nothing cleared the interval then, so the tempo climbed at 12.5 BPM a second
 * until it hit the 300 cap. Measured in the real app before the fix: 120 to
 * 177 in eight seconds with no further input.
 *
 * What makes it worth a test rather than a one-line fix is the diagnosis. The
 * cause is a gesture the user has already forgotten, and the effect lands on
 * whatever they touch next — so it was reported as a different control's
 * fault, and looking there found nothing wrong.
 *
 * Timers are faked so these assert the repeat's LIFETIME rather than racing
 * real wall-clock intervals.
 */

const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 80;

function renderControl() {
  const onChange = vi.fn();
  render(<BpmControl bpm={120} onChange={onChange} />);
  const plus = screen.getByTitle('Increase by 1 (hold to repeat)');
  return { onChange, plus };
}

/** Advance past the hold delay and far enough to fire many repeats. */
function holdFor(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('holding a BPM button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('repeats while held', () => {
    const { onChange, plus } = renderControl();
    fireEvent.pointerDown(plus);
    holdFor(REPEAT_DELAY + REPEAT_INTERVAL * 5);
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('stops when the browser CANCELS the pointer', () => {
    /*
     * The reported bug. `pointercancel` is what a touch device sends when a
     * press turns into a scroll, and it was the one ending nothing listened
     * for.
     */
    const { onChange, plus } = renderControl();
    fireEvent.pointerDown(plus);
    holdFor(REPEAT_DELAY + REPEAT_INTERVAL * 2);
    fireEvent.pointerCancel(plus);

    const afterCancel = onChange.mock.calls.length;
    holdFor(REPEAT_INTERVAL * 100);
    expect(
      onChange.mock.calls.length - afterCancel,
      'the repeat kept firing after the pointer was cancelled, so the tempo runs away on its own',
    ).toBe(0);
  });

  it('stops when the pointer is released anywhere, not just on the button', () => {
    /*
     * A release outside the button — the element moved, the finger drifted,
     * the layout reflowed under it — must still end the repeat.
     */
    const { onChange, plus } = renderControl();
    fireEvent.pointerDown(plus);
    holdFor(REPEAT_DELAY + REPEAT_INTERVAL * 2);
    fireEvent.pointerUp(window);

    const afterRelease = onChange.mock.calls.length;
    holdFor(REPEAT_INTERVAL * 100);
    expect(
      onChange.mock.calls.length - afterRelease,
      'releasing away from the button left the repeat running',
    ).toBe(0);
  });

  it('stops when the window loses focus', () => {
    // A backgrounded tab still runs intervals; coming back to a tripled tempo
    // is the same bug with a longer fuse.
    const { onChange, plus } = renderControl();
    fireEvent.pointerDown(plus);
    holdFor(REPEAT_DELAY + REPEAT_INTERVAL * 2);
    fireEvent.blur(window);

    const afterBlur = onChange.mock.calls.length;
    holdFor(REPEAT_INTERVAL * 100);
    expect(onChange.mock.calls.length - afterBlur).toBe(0);
  });

  it('never drives the tempo past the maximum', () => {
    // Belt and braces: even a repeat that somehow survives cannot produce a
    // value outside the control's own range.
    const onChange = vi.fn();
    render(<BpmControl bpm={299} onChange={onChange} />);
    const plus = screen.getByTitle('Increase by 1 (hold to repeat)');
    fireEvent.pointerDown(plus);
    holdFor(REPEAT_DELAY + REPEAT_INTERVAL * 20);
    for (const [value] of onChange.mock.calls) {
      expect(value).toBeLessThanOrEqual(300);
    }
  });
});
