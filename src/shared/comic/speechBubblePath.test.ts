import { describe, expect, it } from 'vitest';

import { bubbleMetricsForLines, speechBubblePathD } from './speechBubblePath';

describe('speechBubblePath', () => {
  it('sizes bubble from line text', () => {
    const metrics = bubbleMetricsForLines(['Hello world, I am here.']);
    expect(metrics.halfW).toBeGreaterThan(30);
    expect(metrics.halfH).toBeGreaterThan(15);
  });

  it('builds a closed path with a tail', () => {
    const path = speechBubblePathD(100, 50, 40, 22, 100, 120);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('100 120');
  });
});
