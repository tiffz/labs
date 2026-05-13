import { describe, expect, it } from 'vitest';
import { applySectionSelectionExtend, computeLoopHull, suggestMusicalLoopPadSec } from './stanzaPlaybackLoop';
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
});

describe('computeLoopHull', () => {
  it('spans contiguous selection', () => {
    const segments = [seg(0, 0, 1), seg(1, 1, 2), seg(2, 2, 3)];
    expect(computeLoopHull(segments, [0, 1])).toEqual({ start: 0, end: 2 });
  });
});
