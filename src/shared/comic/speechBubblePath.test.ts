import { describe, expect, it } from 'vitest';

import {
  bubbleMetricsForLines,
  roundRectBubblePathD,
  speechBubblePathD,
  tailMouthChordCrossesInterior,
  tailMouthGeometry,
} from './speechBubblePath';

describe('speechBubblePath', () => {
  it('sizes bubble from line text', () => {
    const metrics = bubbleMetricsForLines(['Hello world, I am here.']);
    expect(metrics.halfW).toBeGreaterThan(30);
    expect(metrics.halfH).toBeGreaterThan(15);
  });

  it('builds a closed ellipse path with a tail', () => {
    const path = speechBubblePathD(100, 50, 40, 22, 100, 120);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('100 120');
  });

  it('builds a closed roundRect path without shared-quadratic elbows', () => {
    const path = roundRectBubblePathD(100, 40, 45, 18, 160, 120);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('C ');
    expect(path).toContain('160 120');
  });

  it('places mouth points on the ellipse boundary', () => {
    const cx = 80;
    const cy = 60;
    const halfW = 36;
    const halfH = 20;
    const tailX = 80;
    const tailY = 130;
    const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);

    for (const point of [mouth.left, mouth.right]) {
      const nx = (point.x - cx) / halfW;
      const ny = (point.y - cy) / halfH;
      expect(nx * nx + ny * ny).toBeCloseTo(1, 2);
    }
  });

  it('does not chord through the bubble interior toward a character below', () => {
    const cases = [
      { cx: 100, cy: 50, halfW: 40, halfH: 22, tailX: 100, tailY: 120 },
      { cx: 60, cy: 40, halfW: 28, halfH: 16, tailX: 45, tailY: 110 },
      { cx: 140, cy: 55, halfW: 32, halfH: 18, tailX: 155, tailY: 125 },
    ];
    for (const sample of cases) {
      expect(
        tailMouthChordCrossesInterior(
          sample.cx,
          sample.cy,
          sample.halfW,
          sample.halfH,
          sample.tailX,
          sample.tailY,
        ),
      ).toBe(false);
    }
  });

  it('walks the ellipse body instead of drawing a diameter through the center', () => {
    const path = speechBubblePathD(100, 50, 40, 22, 100, 120);
    expect(path).not.toMatch(/A 40 22 0 1 0/);
    const segments = path.split(' L ').length;
    expect(segments).toBeGreaterThan(10);
  });
});
