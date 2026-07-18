import { describe, expect, it } from 'vitest';

import {
  bubbleMetricsForLines,
  bubbleTextOffsetY,
  ellipseBubbleBodyPathD,
  ellipseBubbleTailPathD,
  fitDialogueLines,
  isDialogueDisplayTruncated,
  roundRectBubbleBodyPathD,
  roundRectBubbleTailPathD,
  roundRectBubbleUnifiedPathD,
  speechBubblePathForLayout,
  tailMouthChordCrossesInterior,
  tailMouthGeometry,
  wrapDialogueText,
} from './speechBubblePath';

describe('speechBubblePath', () => {
  it('sizes bubble from line text', () => {
    const metrics = bubbleMetricsForLines(['Hello world, I am here.']);
    expect(metrics.halfW).toBeGreaterThan(30);
    expect(metrics.halfH).toBeGreaterThan(15);
  });

  it('defaults to a roundRect shape', () => {
    const metrics = bubbleMetricsForLines(['Hi']);
    expect(metrics.shape).toBe('roundRect');
  });

  it('does not shift dialogue downward into bottom pad (avoids stroke clipping)', () => {
    const offset = bubbleTextOffsetY(100, 40, 45, 18, 100, 90, 'roundRect', 10, 11);
    expect(offset).toBe(0);
  });

  it('keeps multi-line dialogue inside the padded bubble box', () => {
    const content = 'Why is the lunchbox humming? It always does that near nowhere useful.';
    const fitted = fitDialogueLines(content, 70, 160);
    const textH =
      (fitted.lines.length - 1) * fitted.metrics.lineHeight + fitted.metrics.fontSize * 1.24;
    const innerH = fitted.metrics.halfH * 2 - fitted.metrics.padY * 2;
    const offset = bubbleTextOffsetY(
      100,
      40,
      fitted.metrics.halfW,
      fitted.metrics.halfH,
      100,
      90,
      fitted.metrics.shape,
      fitted.metrics.padY,
      fitted.metrics.fontSize,
    );
    expect(textH + Math.abs(offset)).toBeLessThanOrEqual(innerH + 0.5);
    for (const line of fitted.lines) {
      expect(line.length * fitted.metrics.fontSize * 0.58).toBeLessThanOrEqual(
        fitted.metrics.halfW * 2 - fitted.metrics.padX * 2 + 0.5,
      );
    }
  });

  it('balances two-line wraps for even centered text', () => {
    const lines = wrapDialogueText('I can explain the spare key.', 16);
    expect(lines.length).toBe(2);
    expect(Math.abs(lines[0]!.length - lines[1]!.length)).toBeLessThanOrEqual(6);
  });

  it('fits typical dialogue without truncation in a mid-size panel width', () => {
    const content = 'Does anyone else smell budget library card? I told you not to bring the traffic cone.';
    const fitted = fitDialogueLines(content, 90, 180);
    expect(isDialogueDisplayTruncated(content, fitted.lines)).toBe(false);
    expect(fitted.lines.join(' ')).not.toContain('…');
  });

  it('flags truncated dialogue when ellipsis drops source words', () => {
    expect(isDialogueDisplayTruncated('Hello there friend', ['Hello…'])).toBe(true);
    expect(isDialogueDisplayTruncated('Hello there', ['Hello there'])).toBe(false);
  });

  it('builds a unified roundRect outline that includes the tip', () => {
    const outline = roundRectBubbleUnifiedPathD(100, 40, 45, 18, 160, 120);
    expect(outline.startsWith('M')).toBe(true);
    expect(outline.endsWith('Z')).toBe(true);
    expect(outline).toContain('C ');
    expect(outline).toContain('160 120');

    // Pure body helper still has no tip (used for bbox-style probes).
    const body = roundRectBubbleBodyPathD(100, 40, 45, 18);
    expect(body).not.toContain('160 120');
  });

  it('attaches the unified roundRect mouth on the bottom edge', () => {
    const cy = 40;
    const halfH = 18;
    const bottom = cy + halfH;
    const outline = roundRectBubbleUnifiedPathD(100, cy, 45, halfH, 100, 90);
    // Mouth corners appear as L/C points on the bottom edge before the tip cubics.
    expect(outline).toContain(` ${bottom}`);
    expect(outline).toContain('100 90');
  });

  it('bends both roundRect tail edges in the same direction (no mirrored wishbone)', () => {
    const cx = 100;
    const cy = 40;
    const halfW = 45;
    const halfH = 18;
    const tipX = 130;
    const tipY = 100;
    const tail = roundRectBubbleTailPathD(cx, cy, halfW, halfH, tipX, tipY);
    const nums = [...tail.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    // M x y C c1x c1y c2x c2y tipx tipy C c3x c3y c4x c4y endx endy Z
    expect(nums.length).toBeGreaterThanOrEqual(14);
    const midMouthX = (nums[0]! + nums[12]!) / 2;
    const midMouthY = (nums[1]! + nums[13]!) / 2;
    const dx = tipX - midMouthX;
    const dy = tipY - midMouthY;
    const perpX = -Math.sin(Math.atan2(dy, dx));
    const perpY = Math.cos(Math.atan2(dy, dx));
    // Project early control points onto the shared perpendicular — same sign = same bend.
    const side = (x: number, y: number) => (x - midMouthX) * perpX + (y - midMouthY) * perpY;
    const s1 = side(nums[2]!, nums[3]!);
    const s4 = side(nums[10]!, nums[11]!);
    expect(Math.sign(s1)).toBe(Math.sign(s4));
    expect(Math.abs(s1)).toBeGreaterThan(0.5);
  });

  it('builds a closed ellipse body helper and a filled-tail probe', () => {
    const body = ellipseBubbleBodyPathD(100, 50, 40, 22);
    expect(body.startsWith('M')).toBe(true);
    expect(body.endsWith('Z')).toBe(true);
    expect(body).not.toContain('100 120');

    const tail = ellipseBubbleTailPathD(100, 50, 40, 22, 100, 120);
    expect(tail.endsWith('Z')).toBe(true);
    expect(tail).toContain('100 120');
  });

  it('speechBubblePathForLayout defaults to a unified roundRect outline', () => {
    const paths = speechBubblePathForLayout(100, 40, 45, 18, 160, 120);
    expect(paths.body.endsWith('Z')).toBe(true);
    expect(paths.tail).toBe('');
    expect(paths.body).toContain('160 120');
    expect(paths.body).toContain('C ');
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
    const body = ellipseBubbleBodyPathD(100, 50, 40, 22);
    expect(body).not.toMatch(/A 40 22 0 1 0/);
    const segments = body.split(' L ').length;
    expect(segments).toBeGreaterThan(10);
  });
});
