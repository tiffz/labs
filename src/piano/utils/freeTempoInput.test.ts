import { describe, it, expect } from 'vitest';
import { canAdvanceWhileWaitingForRelease, getLatestAttackTime } from './freeTempoInput';

describe('freeTempoInput', () => {
  it('returns latest attack time from played notes', () => {
    const midiTimes = new Map<number, number>([
      [60, 1000],
      [64, 1120],
      [67, 1090],
    ]);
    expect(getLatestAttackTime([60, 67, 64], midiTimes)).toBe(1120);
  });

  it('allows bypass for tie continuation', () => {
    const midiTimes = new Map<number, number>([[60, 1000]]);
    expect(
      canAdvanceWhileWaitingForRelease({
        played: [60],
        midiTimes,
        lastAdvanceInputTime: 1500,
        canBypassForTieContinuation: true,
      })
    ).toBe(true);
  });

  it('blocks when there is no new attack after advance', () => {
    const midiTimes = new Map<number, number>([
      [60, 1000],
      [64, 1001],
    ]);
    expect(
      canAdvanceWhileWaitingForRelease({
        played: [60, 64],
        midiTimes,
        lastAdvanceInputTime: 1001,
        canBypassForTieContinuation: false,
      })
    ).toBe(false);
  });

  it('allows legato overlap when a new key attack arrives', () => {
    const midiTimes = new Map<number, number>([
      [60, 1000], // still held from previous note
      [62, 1105], // newly pressed next note
    ]);
    expect(
      canAdvanceWhileWaitingForRelease({
        played: [60, 62],
        midiTimes,
        lastAdvanceInputTime: 1000,
        canBypassForTieContinuation: false,
      })
    ).toBe(true);
  });
});
