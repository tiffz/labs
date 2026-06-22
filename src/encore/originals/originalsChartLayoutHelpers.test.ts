import { describe, expect, it } from 'vitest';
import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import { chartLayoutHasPaintedChords } from './originalsChartLayoutHelpers';

describe('chartLayoutHasPaintedChords', () => {
  it('returns false when no chord markers exist', () => {
    const layout = parseChordProToChartLayout('[Verse]\nHello world');
    expect(chartLayoutHasPaintedChords(layout)).toBe(false);
  });

  it('returns true when at least one chord marker exists', () => {
    const layout = parseChordProToChartLayout('[Verse]\n[F]Hello');
    expect(chartLayoutHasPaintedChords(layout)).toBe(true);
  });
});
