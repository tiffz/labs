import { describe, expect, it } from 'vitest';
import {
  applyLatencyCompensation,
  nearestGridTargetSec,
  expectedNoteCountForExercise,
} from './rhythmGuard';

describe('rhythmGuard', () => {
  it('applyLatencyCompensation subtracts measured latency from raw delta', () => {
    expect(applyLatencyCompensation(50, 40)).toBe(10);
    expect(applyLatencyCompensation(-30, 20)).toBe(-50);
  });

  it('nearestGridTargetSec finds midpoint between quarter pulses at bpm 60', () => {
    const beatSec = 1;
    const half = beatSec / 2;
    const hit = nearestGridTargetSec(half, 60, 'quarter', 2);
    expect(hit.slotIndexGlobal).toBeGreaterThanOrEqual(0);
    expect(hit.slotIndexGlobal).toBeLessThan(8);
    expect(Math.abs(hit.deltaMsRaw)).toBeLessThanOrEqual(500);
  });

  it('expectedNoteCountForExercise matches mixed grid length', () => {
    expect(expectedNoteCountForExercise('mixed', 1)).toBe(24);
    expect(expectedNoteCountForExercise('quarter', 2)).toBe(8);
  });
});
