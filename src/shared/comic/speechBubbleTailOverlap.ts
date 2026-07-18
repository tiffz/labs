/**
 * Pairwise speech-bubble tail overlap checks (hard quality rule).
 */

import { roundRectTailMouth, tailMouthGeometry } from './speechBubblePath';
import type { SpeechBubbleLayout } from './speechBubbleLayout';

type Point = { x: number; y: number };

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    Math.min(a.x, b.x) - 1e-6 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-6 &&
    Math.min(a.y, b.y) - 1e-6 <= c.y &&
    c.y <= Math.max(a.y, b.y) + 1e-6
  );
}

/** Proper segment intersection (including colinear overlap). */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);

  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 1e-6 && onSegment(a1, a2, b1)) return true;
  if (Math.abs(o2) < 1e-6 && onSegment(a1, a2, b2)) return true;
  if (Math.abs(o3) < 1e-6 && onSegment(b1, b2, a1)) return true;
  if (Math.abs(o4) < 1e-6 && onSegment(b1, b2, a2)) return true;
  return false;
}

function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const b1 = orient(a, b, p) < 0;
  const b2 = orient(b, c, p) < 0;
  const b3 = orient(c, a, p) < 0;
  return b1 === b2 && b2 === b3;
}

function trianglesIntersect(a: [Point, Point, Point], b: [Point, Point, Point]): boolean {
  const edgesA: Array<[Point, Point]> = [
    [a[0], a[1]],
    [a[1], a[2]],
    [a[2], a[0]],
  ];
  const edgesB: Array<[Point, Point]> = [
    [b[0], b[1]],
    [b[1], b[2]],
    [b[2], b[0]],
  ];
  for (const [p, q] of edgesA) {
    for (const [r, s] of edgesB) {
      if (segmentsIntersect(p, q, r, s)) return true;
    }
  }
  if (pointInTriangle(a[0], b[0], b[1], b[2])) return true;
  if (pointInTriangle(b[0], a[0], a[1], a[2])) return true;
  return false;
}

function tailMouthForBubble(bubble: SpeechBubbleLayout) {
  if (bubble.metrics.shape === 'roundRect') {
    return roundRectTailMouth(
      bubble.cx,
      bubble.cy,
      bubble.halfW,
      bubble.halfH,
      bubble.tailX,
      bubble.tailY,
    );
  }
  return tailMouthGeometry(
    bubble.cx,
    bubble.cy,
    bubble.halfW,
    bubble.halfH,
    bubble.tailX,
    bubble.tailY,
  );
}

function tailWedge(bubble: SpeechBubbleLayout): [Point, Point, Point] {
  const mouth = tailMouthForBubble(bubble);
  return [mouth.left, mouth.right, mouth.tip];
}

function mouthMidToTip(bubble: SpeechBubbleLayout): [Point, Point] {
  const mouth = tailMouthForBubble(bubble);
  return [
    { x: (mouth.left.x + mouth.right.x) / 2, y: (mouth.left.y + mouth.right.y) / 2 },
    mouth.tip,
  ];
}

function pointInBubbleTextAabb(p: Point, bubble: SpeechBubbleLayout, margin = 2): boolean {
  const padX = bubble.metrics.padX;
  const padY = bubble.metrics.padY;
  return (
    p.x >= bubble.cx - bubble.halfW + padX - margin &&
    p.x <= bubble.cx + bubble.halfW - padX + margin &&
    p.y >= bubble.cy - bubble.halfH + padY - margin &&
    p.y <= bubble.cy + bubble.halfH - padY + margin
  );
}

function pointInBubbleBody(p: Point, bubble: SpeechBubbleLayout, margin = 1): boolean {
  return (
    p.x >= bubble.cx - bubble.halfW - margin &&
    p.x <= bubble.cx + bubble.halfW + margin &&
    p.y >= bubble.cy - bubble.halfH - margin &&
    p.y <= bubble.cy + bubble.halfH + margin
  );
}

function segmentHitsAabb(
  a: Point,
  b: Point,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  if (
    (a.x >= left && a.x <= right && a.y >= top && a.y <= bottom) ||
    (b.x >= left && b.x <= right && b.y >= top && b.y <= bottom)
  ) {
    return true;
  }
  const corners: Point[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
  for (let i = 0; i < 4; i++) {
    if (segmentsIntersect(a, b, corners[i]!, corners[(i + 1) % 4]!)) return true;
  }
  return false;
}

function segmentHitsTextAabb(a: Point, b: Point, bubble: SpeechBubbleLayout): boolean {
  if (pointInBubbleTextAabb(a, bubble) || pointInBubbleTextAabb(b, bubble)) return true;
  const left = bubble.cx - bubble.halfW + bubble.metrics.padX;
  const right = bubble.cx + bubble.halfW - bubble.metrics.padX;
  const top = bubble.cy - bubble.halfH + bubble.metrics.padY;
  const bottom = bubble.cy + bubble.halfH - bubble.metrics.padY;
  return segmentHitsAabb(a, b, left, top, right, bottom);
}

/** Tail wedge overlaps another bubble's body (not just dialogue text). */
function wedgeHitsBubbleBody(wedge: [Point, Point, Point], bubble: SpeechBubbleLayout): boolean {
  const [left, right, tip] = wedge;
  // Mouth sits on the owner — only tip / spine samples count against the other body.
  if (pointInBubbleBody(tip, bubble)) return true;
  const midMouth = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const mid = {
    x: midMouth.x * 0.35 + tip.x * 0.65,
    y: midMouth.y * 0.35 + tip.y * 0.65,
  };
  if (pointInBubbleBody(mid, bubble)) return true;
  const bodyLeft = bubble.cx - bubble.halfW;
  const bodyRight = bubble.cx + bubble.halfW;
  const bodyTop = bubble.cy - bubble.halfH;
  const bodyBottom = bubble.cy + bubble.halfH;
  const edges: Array<[Point, Point]> = [
    [left, tip],
    [right, tip],
  ];
  for (const [p, q] of edges) {
    if (segmentHitsAabb(p, q, bodyLeft, bodyTop, bodyRight, bodyBottom)) return true;
  }
  return false;
}

/** True when two bubbles’ tails cross, or a tail cuts the other’s body / dialogue. */
export function bubblesTailsOverlap(a: SpeechBubbleLayout, b: SpeechBubbleLayout): boolean {
  const [aMid, aTip] = mouthMidToTip(a);
  const [bMid, bTip] = mouthMidToTip(b);
  if (segmentsIntersect(aMid, aTip, bMid, bTip)) return true;
  if (trianglesIntersect(tailWedge(a), tailWedge(b))) return true;
  if (segmentHitsTextAabb(aMid, aTip, b)) return true;
  if (segmentHitsTextAabb(bMid, bTip, a)) return true;
  if (wedgeHitsBubbleBody(tailWedge(a), b)) return true;
  if (wedgeHitsBubbleBody(tailWedge(b), a)) return true;
  return false;
}

export function anyBubbleTailsOverlap(bubbles: SpeechBubbleLayout[]): boolean {
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      if (bubblesTailsOverlap(bubbles[i]!, bubbles[j]!)) return true;
    }
  }
  return false;
}
