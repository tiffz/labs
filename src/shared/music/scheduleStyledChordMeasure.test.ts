import { describe, expect, it, vi } from 'vitest';
import { scheduleStyledChordMeasure } from './scheduleStyledChordMeasure';

describe('scheduleStyledChordMeasure', () => {
  it('schedules playNote calls for a valid chord symbol', () => {
    const playNote = vi.fn();
    const instrument = { playNote, stopAll: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };

    const scheduled = scheduleStyledChordMeasure({
      symbol: 'Fm',
      styleId: 'simple',
      instrument,
      measureStartTime: 1,
      measureDurationSec: 2,
      timeSignature: { numerator: 4, denominator: 4 },
      velocity: 0.8,
    });

    expect(scheduled).toBe(true);
    expect(playNote).toHaveBeenCalled();
    const firstCall = playNote.mock.calls[0]?.[0] as { startTime: number; frequency: number };
    expect(firstCall.startTime).toBeGreaterThanOrEqual(1);
    expect(firstCall.frequency).toBeGreaterThan(0);
  });

  it('returns false when velocity is zero (muted)', () => {
    const playNote = vi.fn();
    const instrument = { playNote, stopAll: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };

    expect(
      scheduleStyledChordMeasure({
        symbol: 'C',
        styleId: 'simple',
        instrument,
        measureStartTime: 0,
        measureDurationSec: 2,
        timeSignature: { numerator: 4, denominator: 4 },
        velocity: 0,
      }),
    ).toBe(false);
    expect(playNote).not.toHaveBeenCalled();
  });
});
