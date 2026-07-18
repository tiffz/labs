/**
 * Geometric validation for rendered speech-bubble SVG paths and text placement.
 *
 * Complements layout invariants (speechBubbleQuality) with checks on the actual
 * path `d` string and whether dialogue sits in the tail wedge.
 */

import type { SpeechBubbleLayout } from './speechBubbleLayout';
import {
  bubbleTextOffsetY,
  speechBubblePathForLayout,
  tailMouthGeometry,
  type BubblePathPair,
  type BubbleShape,
} from './speechBubblePath';

export type PathGeometryViolationCode =
  | 'path_not_closed'
  | 'path_legacy_ellipse_arc'
  | 'path_missing_tail_tip'
  | 'tail_not_closed'
  | 'tail_not_unified'
  | 'mouth_off_ellipse'
  | 'tail_misaimed'
  | 'text_in_tail_wedge';

export type PathGeometryViolation = {
  code: PathGeometryViolationCode;
  message: string;
};

type Point = { x: number; y: number };

const MOUTH_ON_ELLIPSE_TOLERANCE = 0.08;

function normalizedEllipseDistance(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): number {
  const nx = (px - cx) / Math.max(halfW, 1);
  const ny = (py - cy) / Math.max(halfH, 1);
  return nx * nx + ny * ny;
}

function pointOnEllipseBoundary(
  point: Point,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): boolean {
  const dist = normalizedEllipseDistance(point.x, point.y, cx, cy, halfW, halfH);
  return Math.abs(dist - 1) <= MOUTH_ON_ELLIPSE_TOLERANCE;
}

function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const sign = (p1: Point, p2: Point, p3: Point): number =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a <= -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

function angleInWedge(target: number, left: number, right: number): boolean {
  const t = normalizeAngle(target);
  const l = normalizeAngle(left);
  const r = normalizeAngle(right);
  if (l <= r) return t >= l - 0.05 && t <= r + 0.05;
  return t >= l - 0.05 || t <= r + 0.05;
}

/**
 * Validate a bubble path pair.
 * Unified model: `body` is the continuous outline (includes tip); `tail` is empty.
 * Legacy separate-tail pairs (non-empty `tail`) still validate closed wedges.
 */
export function validateBubblePathD(
  paths: BubblePathPair,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tipX: number,
  tipY: number,
  shape: BubbleShape = 'roundRect',
): PathGeometryViolation[] {
  const violations: PathGeometryViolation[] = [];
  const body = paths.body.trim();
  const tail = paths.tail.trim();
  const tipToken = `${tipX} ${tipY}`;

  if (!body.endsWith('Z')) {
    violations.push({
      code: 'path_not_closed',
      message: 'Bubble body path is not closed',
    });
  }

  if (tail) {
    // Legacy separate-tail pair (tests / probes).
    if (!tail.endsWith('Z')) {
      violations.push({
        code: 'tail_not_closed',
        message: 'Bubble tail path is not closed — tails must be filled closed wedges',
      });
    }
    if (!tail.includes(tipToken)) {
      violations.push({
        code: 'path_missing_tail_tip',
        message: `Bubble tail path does not reach tail tip (${tipX}, ${tipY})`,
      });
    }
  } else if (!body.includes(tipToken)) {
    violations.push({
      code: 'path_missing_tail_tip',
      message: `Unified bubble outline does not reach tail tip (${tipX}, ${tipY})`,
    });
  } else if (!body.includes('C ')) {
    violations.push({
      code: 'tail_not_unified',
      message: 'Unified bubble outline is missing the curved tail segment',
    });
  }

  if (shape === 'ellipse' && (/\sA\s/i.test(body) || /\sA\s/i.test(tail))) {
    violations.push({
      code: 'path_legacy_ellipse_arc',
      message: 'Bubble path uses legacy elliptical arc commands',
    });
  }

  if (shape === 'ellipse') {
    const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tipX, tipY);
    if (!pointOnEllipseBoundary(mouth.left, cx, cy, halfW, halfH)) {
      violations.push({
        code: 'mouth_off_ellipse',
        message: 'Left tail mouth is off the ellipse boundary',
      });
    }
    if (!pointOnEllipseBoundary(mouth.right, cx, cy, halfW, halfH)) {
      violations.push({
        code: 'mouth_off_ellipse',
        message: 'Right tail mouth is off the ellipse boundary',
      });
    }

    const tailAngle = Math.atan2(tipY - cy, tipX - cx);
    if (!angleInWedge(tailAngle, mouth.angle - mouth.spread, mouth.angle + mouth.spread)) {
      violations.push({
        code: 'tail_misaimed',
        message: 'Tail direction does not align with mouth wedge',
      });
    }
  }

  return violations;
}

/** Check dialogue block center is not inside the tail wedge below the bubble body. */
export function validateBubbleTextPlacement(bubble: SpeechBubbleLayout): PathGeometryViolation[] {
  const violations: PathGeometryViolation[] = [];
  const { cx, cy, halfW, halfH, lines, metrics } = bubble;
  if (lines.length === 0) return violations;

  const offsetY = bubbleTextOffsetY(
    cx,
    cy,
    halfW,
    halfH,
    bubble.tailX,
    bubble.tailY,
    metrics.shape,
    metrics.padY,
    metrics.fontSize,
  );
  /* Match PanelMockupSvg top-anchored first line; block center is mid-stack. */
  const firstLineCenterY = cy - halfH + metrics.padY + metrics.fontSize * 0.5 + offsetY;
  const textCenterY =
    firstLineCenterY + ((Math.max(lines.length, 1) - 1) * metrics.lineHeight) / 2;
  const textCenter: Point = { x: cx, y: textCenterY };

  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, bubble.tailX, bubble.tailY);
  const inWedge = pointInTriangle(textCenter, mouth.left, mouth.right, mouth.tip);
  const belowBody = textCenterY > cy - halfH * 0.15;

  if (inWedge && belowBody) {
    violations.push({
      code: 'text_in_tail_wedge',
      message: 'Dialogue center sits inside the tail wedge',
    });
  }

  return violations;
}

/** Full path + text geometry for one laid-out bubble. */
export function validateSpeechBubbleGeometry(bubble: SpeechBubbleLayout): PathGeometryViolation[] {
  const shape = bubble.metrics.shape;
  const paths = speechBubblePathForLayout(
    bubble.cx,
    bubble.cy,
    bubble.halfW,
    bubble.halfH,
    bubble.tailX,
    bubble.tailY,
    shape,
  );
  return [
    ...validateBubblePathD(
      paths,
      bubble.cx,
      bubble.cy,
      bubble.halfW,
      bubble.halfH,
      bubble.tailX,
      bubble.tailY,
      shape,
    ),
    ...validateBubbleTextPlacement(bubble),
  ];
}

/** DOM path audit shared with Scrapboard e2e smoke. */
export function auditBubblePathElement(d: string): {
  closed: boolean;
  hasLegacyArc: boolean;
  commandCount: number;
} {
  const trimmed = d.trim();
  return {
    closed: trimmed.endsWith('Z'),
    hasLegacyArc: /\sA\s/i.test(trimmed),
    commandCount: (trimmed.match(/[MLQZC]/gi) ?? []).length,
  };
}
