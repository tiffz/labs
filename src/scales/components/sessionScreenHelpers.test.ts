import { describe, expect, it } from 'vitest';
import {
  computeDwellToastCopy,
  exerciseResultBreakdownRows,
  midiToNoteName,
} from './sessionScreenHelpers';

describe('sessionScreenHelpers', () => {
  it('maps MIDI pitch class to note name', () => {
    expect(midiToNoteName(60)).toBe('C');
    expect(midiToNoteName(61)).toBe('C\u266F');
  });

  it('filters zero-count breakdown rows', () => {
    expect(
      exerciseResultBreakdownRows({
        perfect: 3,
        early: 0,
        late: 1,
        wrongPitch: 0,
        missed: 2,
      }),
    ).toEqual([
      { label: 'Perfect', count: 3, color: '#10b981' },
      { label: 'Late', count: 1, color: '#f59e0b' },
      { label: 'Missed', count: 2, color: '#94a3b8' },
    ]);
  });

  it('builds drill dwell toast copy for imperfect run', () => {
    const copy = computeDwellToastCopy({
      result: {
        accuracy: 0.8,
        correct: 8,
        total: 10,
        advanced: false,
        breakdown: { perfect: 8, early: 0, late: 0, wrongPitch: 0, missed: 2 },
      },
      inDrill: true,
      wasClean: false,
      outcomeTier: 'rough',
      streakNumerator: 0,
      streakDenominator: 3,
      usesPerfectRegimen: true,
      overlearnUnlocked: false,
    });
    expect(copy.headline).toBe('Reset');
    expect(copy.subline).toBe('80% · 0/3');
    expect(copy.dwellStatusIcon).toBe('close');
  });

  it('does not label sub-100% metronome runs as Clean under perfect regimen', () => {
    const copy = computeDwellToastCopy({
      result: {
        accuracy: 0.9,
        correct: 9,
        total: 10,
        advanced: false,
        breakdown: { perfect: 9, early: 0, late: 0, wrongPitch: 0, missed: 1 },
      },
      inDrill: false,
      wasClean: false,
      outcomeTier: 'clean',
      streakNumerator: 0,
      streakDenominator: 0,
      usesPerfectRegimen: true,
      overlearnUnlocked: false,
    });
    expect(copy.headline).toBe('Again');
    expect(copy.subline).toBe('90% · first perfect sets your target');
    expect(copy.dwellStatusIcon).toBe('close');
  });

  it('shows perfect streak subline only after overlearning target unlocks', () => {
    const copy = computeDwellToastCopy({
      result: {
        accuracy: 1,
        correct: 10,
        total: 10,
        advanced: false,
        breakdown: { perfect: 10, early: 0, late: 0, wrongPitch: 0, missed: 0 },
      },
      inDrill: false,
      wasClean: true,
      outcomeTier: 'clean',
      streakNumerator: 1,
      streakDenominator: 4,
      usesPerfectRegimen: true,
      overlearnUnlocked: true,
    });
    expect(copy.headline).toBe('Perfect');
    expect(copy.subline).toBe('100% · 1/4 perfect runs');
  });
});
