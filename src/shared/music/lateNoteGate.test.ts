// @vitest-environment node
/**
 * Reported in the darbuka app: "the playback for the app seems to pause suddenly then when it
 * resumed it was extra fast."
 *
 * Both halves are one mechanism. Scheduling falls behind (a stall, a GC pause, a throttled rAF),
 * so nothing is queued — the pause. On the next tick the backlog is scheduled with start times
 * already in the past, and Web Audio clamps a past `start()` to "now", so they all fire together —
 * the burst that sounds like a tempo jump.
 */
import { describe, expect, it } from 'vitest';
import { NOTE_LATE_SKIP_SEC, isNoteStillScheduleable } from './lateNoteGate';

describe('isNoteStillScheduleable', () => {
  it('schedules a note comfortably in the future', () => {
    expect(isNoteStillScheduleable(10.5, 10.0)).toBe(true);
  });

  it('schedules a note due right now', () => {
    expect(isNoteStillScheduleable(10.0, 10.0)).toBe(true);
  });

  it('tolerates the sub-millisecond lag between computing a time and using it', () => {
    expect(isNoteStillScheduleable(10.0 - NOTE_LATE_SKIP_SEC / 2, 10.0)).toBe(true);
  });

  it('drops a note whose moment has passed — the burst this prevents', () => {
    expect(isNoteStillScheduleable(10.0 - NOTE_LATE_SKIP_SEC - 0.001, 10.0)).toBe(false);
  });

  it('drops an entire backlog rather than stacking it', () => {
    // A 400ms stall at 80 BPM (750ms/beat) is under the one-beat gap guard, so every one of these
    // reaches the scheduler with a past start time. Clamped, they would fire as a single burst.
    const now = 100;
    const backlog = [99.6, 99.7, 99.8, 99.9];
    const scheduled = backlog.filter((t) => isNoteStillScheduleable(t, now));
    expect(scheduled).toEqual([]);
  });

  it('keeps the notes after the stall, so playback resumes in time rather than silently', () => {
    const now = 100;
    const upcoming = [100.05, 100.2, 100.5];
    expect(upcoming.every((t) => isNoteStillScheduleable(t, now))).toBe(true);
  });

  it('refuses non-finite input instead of scheduling at NaN', () => {
    expect(isNoteStillScheduleable(Number.NaN, 10)).toBe(false);
    expect(isNoteStillScheduleable(10, Number.NaN)).toBe(false);
  });
});
