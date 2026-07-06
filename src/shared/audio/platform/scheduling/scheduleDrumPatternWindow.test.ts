import { describe, expect, it, vi } from 'vitest';
import { parseRhythm } from '../../../rhythm/rhythmParser';
import { scheduleDrumPatternWindow } from './scheduleDrumPatternWindow';

describe('scheduleDrumPatternWindow', () => {
  it('schedules hits in the beat window', () => {
    const rhythm = parseRhythm('D---', { numerator: 4, denominator: 4 });
    const playAt = vi.fn();
    scheduleDrumPatternWindow({
      rhythm,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      volume: 100,
      scheduledUpToBeats: 0,
      scheduleEndBeats: 1,
      startAudioTime: 1,
      playAt,
    });
    expect(playAt).toHaveBeenCalled();
    const [, audioTime] = playAt.mock.calls[0]!;
    expect(audioTime).toBeGreaterThanOrEqual(1);
  });

  it('skips scheduling when volume is zero', () => {
    const rhythm = parseRhythm('D---', { numerator: 4, denominator: 4 });
    const playAt = vi.fn();
    scheduleDrumPatternWindow({
      rhythm,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      volume: 0,
      scheduledUpToBeats: 0,
      scheduleEndBeats: 4,
      startAudioTime: 0,
      playAt,
    });
    expect(playAt).not.toHaveBeenCalled();
  });
});
