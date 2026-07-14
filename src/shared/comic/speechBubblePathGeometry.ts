/**
 * Geometric validation for rendered speech-bubble SVG paths and text placement.
 *
 * Complements layout invariants (speechBubbleQuality) with checks on the actual
 * path `d` string and whether dialogue sits in the tail wedge.
 */

import type { SpeechBubbleLayout } from './speechBubbleLayout';
import {
  bubbleTextBlockHeight,
  bubbleTextOffsetY,
  speechBubblePathForLayout,
  tailMouthGeometry,
  type BubbleShape,
} from './speechBubblePath';

export type PathGeometryViolationCode =
  | 'path_not_closed'
  | 'path_legacy_ellipse_arc'
  | 'path_missing_tail_tip'
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

/** Validate a bubble path `d` string against expected geometry. */
export function validateBubblePathD(
  pathD: string,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
  shape: BubbleShape = 'ellipse',
): PathGeometryViolation[] {
  const violations: PathGeometryViolation[] = [];
  const trimmed = pathD.trim();

  if (!trimmed.endsWith('Z')) {
    violations.push({
      code: 'path_not_closed',
      message: 'Bubble path is not closed',
    });
  }

  if (shape === 'ellipse' && /\sA\s/i.test(trimmed)) {
    violations.push({
      code: 'path_legacy_ellipse_arc',
      message: 'Bubble path uses legacy elliptical arc commands',
    });
  }

  const tipToken = `${tailX} ${tailY}`;
  if (!trimmed.includes(tipToken)) {
    violations.push({
      code: 'path_missing_tail_tip',
      message: `Bubble path does not reach tail tip (${tailX}, ${tailY})`,
    });
  }

  if (shape === 'ellipse') {
    const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
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

    const tailAngle = Math.atan2(tailY - cy, tailX - cx);
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
  const { cx, cy, halfW, halfH, tailX, tailY, lines, metrics } = bubble;
  if (lines.length === 0) return violations;

  const offsetY = bubbleTextOffsetY(cx, cy, halfW, halfH, tailX, tailY, metrics.shape);
  const textTop =
    cy - ((lines.length - 1) * metrics.lineHeight) / 2 + offsetY;
  const textH = bubbleTextBlockHeight(lines.length, metrics.lineHeight, metrics.fontSize);
  const textCenterY = textTop + textH / 2;
  const textCenter: Point = { x: cx, y: textCenterY };

  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
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
  const pathD = speechBubblePathForLayout(
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
      pathD,
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

/** Browser/e2e helper — audit path `d` attributes without importing layout code. */
export function auditBubblePathElement(pathD: string | null | undefined): {
  closed: boolean;
  hasLegacyArc: boolean;
  commandCount: number;
} {
  const d = (pathD ?? '').trim();
  return {
    closed: d.endsWith('Z'),
    hasLegacyArc: /\sA\s/i.test(d),
    commandCount: (d.match(/[MLQZ]/gi) ?? []).length,
  };
}
