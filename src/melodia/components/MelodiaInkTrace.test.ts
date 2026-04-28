import { describe, expect, it } from 'vitest';
import { catmullRomPath } from './MelodiaInkTrace.utils';

describe('catmullRomPath', () => {
  it('returns empty string for an empty list', () => {
    expect(catmullRomPath([])).toBe('');
  });

  it('produces a single moveTo for one point', () => {
    expect(catmullRomPath([{ x: 10, y: 20 }])).toBe('M 10 20');
  });

  it('produces a line for two points', () => {
    expect(catmullRomPath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M 0 0 L 10 5');
  });

  it('produces a cubic-bezier path for three or more points', () => {
    const path = catmullRomPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
    expect(path.startsWith('M 0 0')).toBe(true);
    expect(path).toMatch(/ C [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ 10\.00 5\.00/);
    expect(path).toMatch(/ C [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ 20\.00 0\.00/);
  });

  it('passes through every input point', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 10 },
      { x: 12, y: 4 },
      { x: 18, y: 20 },
    ];
    const path = catmullRomPath(points);
    for (const p of points.slice(1)) {
      expect(path.includes(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`)).toBe(true);
    }
  });
});
