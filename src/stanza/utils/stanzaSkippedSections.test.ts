import { describe, expect, it } from 'vitest';
import type { DerivedSegment } from './segments';
import {
  firstPlayableTimeInWindow,
  lastPlayableTimeInWindow,
  nextNonSkippedTimeForwardPlayback,
} from './stanzaSkippedSections';

function seg(index: number, start: number, end: number): DerivedSegment {
  return { id: `seg-${index}`, index, start, end, label: `s${index}` };
}

describe('nextNonSkippedTimeForwardPlayback', () => {
  const segments: DerivedSegment[] = [
    seg(0, 0, 10),
    seg(1, 10, 20),
    seg(2, 20, 30),
    seg(3, 30, 40),
    seg(4, 40, 50),
  ];

  it('returns null when current section is not skipped', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-2': true },
      currentTime: 5,
      windowStart: 0,
      windowEnd: 50,
      loop: false,
    });
    expect(got).toBeNull();
  });

  it('jumps to the next non-skipped section when inside a single skipped section', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-1': true },
      currentTime: 12,
      windowStart: 0,
      windowEnd: 50,
      loop: false,
    });
    expect(got).toBe(20);
  });

  it('walks past contiguous skipped runs', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-1': true, 'seg-2': true, 'seg-3': true },
      currentTime: 12,
      windowStart: 0,
      windowEnd: 50,
      loop: false,
    });
    expect(got).toBe(40);
  });

  it('returns windowStart when the skip run reaches the end and loop is true', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-3': true, 'seg-4': true },
      currentTime: 32,
      windowStart: 0,
      windowEnd: 50,
      loop: true,
    });
    expect(got).toBe(0);
  });

  it('loops to the first playable time when the window start is skipped', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-0': true, 'seg-3': true, 'seg-4': true },
      currentTime: 32,
      windowStart: 0,
      windowEnd: 50,
      loop: true,
    });
    expect(got).toBe(10);
  });

  it('returns null when the skip run reaches the end and loop is false', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-3': true, 'seg-4': true },
      currentTime: 32,
      windowStart: 0,
      windowEnd: 50,
      loop: false,
    });
    expect(got).toBeNull();
  });

  it('respects a narrower loop window: skipped section landing past windowEnd loops back', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-2': true, 'seg-3': true },
      currentTime: 22,
      // Loop covers seg-2 and seg-3 (20..40); both are skipped → restart.
      windowStart: 20,
      windowEnd: 40,
      loop: true,
    });
    expect(got).toBe(20);
  });

  it('clamps the jump target to windowStart when the next non-skipped start is earlier', () => {
    // Window 25..45 — entering at 22 is outside the window, returns null.
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: { 'seg-2': true },
      currentTime: 22,
      windowStart: 25,
      windowEnd: 45,
      loop: false,
    });
    expect(got).toBeNull();
  });

  it('returns null when no skipped set is given', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments,
      skipped: undefined,
      currentTime: 12,
      windowStart: 0,
      windowEnd: 50,
      loop: false,
    });
    expect(got).toBeNull();
  });

  it('returns null when there are no segments', () => {
    const got = nextNonSkippedTimeForwardPlayback({
      segments: [],
      skipped: { 'seg-0': true },
      currentTime: 5,
      windowStart: 0,
      windowEnd: 50,
      loop: true,
    });
    expect(got).toBeNull();
  });
});

describe('firstPlayableTimeInWindow', () => {
  const segments: DerivedSegment[] = [
    seg(0, 0, 10),
    seg(1, 10, 20),
    seg(2, 20, 30),
    seg(3, 30, 40),
  ];

  it('skips leading skipped sections at the window start', () => {
    expect(firstPlayableTimeInWindow(segments, { 'seg-0': true }, 0, 40)).toBe(10);
    expect(firstPlayableTimeInWindow(segments, undefined, 0, 40)).toBe(0);
  });

  it('returns the first non-skipped start inside a selection window', () => {
    expect(firstPlayableTimeInWindow(segments, { 'seg-1': true }, 10, 30)).toBe(20);
  });
});

describe('lastPlayableTimeInWindow', () => {
  const segments: DerivedSegment[] = [
    seg(0, 0, 10),
    seg(1, 10, 20),
    seg(2, 20, 30),
    seg(3, 30, 40),
  ];

  it('returns the end of the last playable section before the window end', () => {
    expect(lastPlayableTimeInWindow(segments, { 'seg-3': true }, 0, 40)).toBeCloseTo(30 - 0.02);
  });

  it('skips trailing skipped sections inside the window', () => {
    expect(lastPlayableTimeInWindow(segments, { 'seg-2': true, 'seg-3': true }, 0, 40)).toBeCloseTo(
      20 - 0.02,
    );
  });
});
