import { describe, expect, it } from 'vitest';
import { buildMetronomeMeasureLabels } from './metronomeRailLabels';

describe('buildMetronomeMeasureLabels', () => {
  const ts = { numerator: 4, denominator: 4 };

  it('returns beat numbers only at subdivision level 1', () => {
    const labels = buildMetronomeMeasureLabels({
      timeSignature: ts,
      subdivisionLevel: 1,
      voiceMode: 'counting',
    });
    expect(labels.map((l) => l.label)).toEqual(['1', '2', '3', '4']);
    expect(labels.every((l) => l.isBeat)).toBe(true);
  });

  it('returns 1e+a pattern at subdivision level 4', () => {
    const labels = buildMetronomeMeasureLabels({
      timeSignature: ts,
      subdivisionLevel: 4,
      voiceMode: 'counting',
    });
    expect(labels.map((l) => l.label)).toEqual([
      '1',
      'e',
      '+',
      'a',
      '2',
      'e',
      '+',
      'a',
      '3',
      'e',
      '+',
      'a',
      '4',
      'e',
      '+',
      'a',
    ]);
  });

  it('returns beat-plus pattern at subdivision level 2', () => {
    const labels = buildMetronomeMeasureLabels({
      timeSignature: ts,
      subdivisionLevel: 2,
      voiceMode: 'counting',
    });
    expect(labels.map((l) => l.label)).toEqual(['1', '+', '2', '+', '3', '+', '4', '+']);
  });
});
