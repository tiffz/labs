import { describe, expect, it } from 'vitest';
import { resolveOriginalsChartEditStage } from './originalsChartEditStage';

describe('resolveOriginalsChartEditStage', () => {
  it('opens chords when chords are shown and painted', () => {
    expect(resolveOriginalsChartEditStage(true, true)).toBe('chords');
  });

  it('opens lyrics when chords are hidden', () => {
    expect(resolveOriginalsChartEditStage(false, true)).toBe('write');
  });

  it('opens lyrics when no painted chords exist', () => {
    expect(resolveOriginalsChartEditStage(true, false)).toBe('write');
  });
});
