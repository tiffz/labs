import { describe, expect, it } from 'vitest';
import {
  applySectionSelectionExtend,
  computeLoopHull,
  effectiveBpmForSelectedSpan,
  isPastLoopWrapPoint,
  STANZA_LOOP_WRAP_TOLERANCE_SEC,
  suggestMusicalLoopPadSec,
} from './stanzaPlaybackLoop';
import type { DerivedSegment } from './segments';

const seg = (index: number, start: number, end: number): DerivedSegment => ({
  id: `s${index}`,
  index,
  start,
  end,
  label: `S${index}`,
});

describe('applySectionSelectionExtend', () => {
  it('extends start earlier with negative startDelta', () => {
    const r = applySectionSelectionExtend({ start: 10, end: 20 }, { startDelta: -2, endDelta: 0 }, 100);
    expect(r.start).toBe(8);
    expect(r.end).toBe(20);
  });

  it('extends end later with positive endDelta', () => {
    const r = applySectionSelectionExtend({ start: 10, end: 20 }, { startDelta: 0, endDelta: 1.5 }, 100);
    expect(r.start).toBe(10);
    expect(r.end).toBe(21.5);
  });

  it('clamps to duration', () => {
    const r = applySectionSelectionExtend({ start: 8, end: 9.5 }, { startDelta: -20, endDelta: 50 }, 10);
    expect(r.start).toBeGreaterThanOrEqual(0);
    expect(r.end).toBeLessThanOrEqual(10);
    expect(r.end - r.start).toBeGreaterThanOrEqual(0.12);
  });
});

describe('effectiveBpmForSelectedSpan', () => {
  const segments: DerivedSegment[] = [seg(0, 0, 5), seg(1, 5, 10)];

  it('defaults to 120 when no calibration', () => {
    expect(effectiveBpmForSelectedSpan([0], segments, undefined)).toBe(120);
  });

  it('uses section calibration when present', () => {
    expect(
      effectiveBpmForSelectedSpan([1], segments, {
        s1: { bpm: 90, anchorMediaTime: 5, source: 'tap' },
      }),
    ).toBe(90);
  });
});

describe('suggestMusicalLoopPadSec', () => {
  const segments: DerivedSegment[] = [seg(0, 0, 5), seg(1, 5, 10)];

  it('uses metronome BPM when present', () => {
    const pad = suggestMusicalLoopPadSec([1], segments, {
      s1: { bpm: 120, anchorMediaTime: 0, source: 'tap' },
    });
    expect(pad).toBeGreaterThanOrEqual(0.18);
    expect(pad).toBeLessThanOrEqual(0.85);
    expect(pad).toBeCloseTo((60 / 120) * 0.85, 5);
  });

  it('falls back when no BPM', () => {
    const pad = suggestMusicalLoopPadSec([0], segments, undefined);
    expect(pad).toBeCloseTo(0.425, 2);
  });

  it('uses whole-song metronome when section has no calibration', () => {
    const pad = suggestMusicalLoopPadSec(
      [0],
      segments,
      undefined,
      { bpm: 120, anchorMediaTime: 0, source: 'tap' },
    );
    expect(pad).toBeCloseTo((60 / 120) * 0.85, 5);
  });
});

describe('computeLoopHull', () => {
  it('spans contiguous selection', () => {
    const segments = [seg(0, 0, 1), seg(1, 1, 2), seg(2, 2, 3)];
    expect(computeLoopHull(segments, [0, 1])).toEqual({ start: 0, end: 2 });
  });
});

describe('isPastLoopWrapPoint', () => {
  it('does not wrap until the playhead is within sub-frame tolerance of loop end', () => {
    const end = 180;
    expect(isPastLoopWrapPoint(end - 0.06, end)).toBe(false);
    expect(isPastLoopWrapPoint(end - STANZA_LOOP_WRAP_TOLERANCE_SEC, end)).toBe(true);
    expect(isPastLoopWrapPoint(end, end)).toBe(true);
  });
});
