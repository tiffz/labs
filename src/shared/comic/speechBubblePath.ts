/** Comic speech bubble path + text-aware sizing. */

export const BUBBLE_FONT_SIZE = 11;
export const BUBBLE_MIN_READABLE_FONT = 9;
export const BUBBLE_FONT_FAMILY = '"Comic Sans MS", "Comic Neue", cursive, sans-serif';
export const BUBBLE_PAD_X = 12;
export const BUBBLE_PAD_Y = 10;
export const BUBBLE_PAD_X_COMPACT = 8;
export const BUBBLE_PAD_Y_COMPACT = 5;
const MAX_ASPECT_ELLIPSE = 0.55;
const MAX_ASPECT_ROUND_RECT = 0.72;
const MIN_HEIGHT_RATIO_ELLIPSE = 0.28;
const MIN_HEIGHT_RATIO_ROUND_RECT = 0.34;
const MIN_FONT_SIZE = 6;
const HARD_MIN_FONT_SIZE = 5;

export type BubbleShape = 'ellipse' | 'roundRect';

export type BubblePadding = { padX: number; padY: number };

export const BUBBLE_PADDING_STANDARD: BubblePadding = {
  padX: BUBBLE_PAD_X,
  padY: BUBBLE_PAD_Y,
};

export const BUBBLE_PADDING_COMPACT: BubblePadding = {
  padX: BUBBLE_PAD_X_COMPACT,
  padY: BUBBLE_PAD_Y_COMPACT,
};

export const BUBBLE_PADDING_MINIMAL: BubblePadding = { padX: 5, padY: 3 };
export const BUBBLE_PADDING_MICRO: BubblePadding = { padX: 3, padY: 2 };

const PADDING_TIERS: BubblePadding[] = [
  BUBBLE_PADDING_STANDARD,
  BUBBLE_PADDING_COMPACT,
  BUBBLE_PADDING_MINIMAL,
  BUBBLE_PADDING_MICRO,
];

export type BubbleMetrics = {
  halfW: number;
  halfH: number;
  fontSize: number;
  lineHeight: number;
  padX: number;
  padY: number;
  shape: BubbleShape;
};

function maxAspectForShape(shape: BubbleShape): number {
  return shape === 'roundRect' ? MAX_ASPECT_ROUND_RECT : MAX_ASPECT_ELLIPSE;
}

function minHeightRatioForShape(shape: BubbleShape): number {
  return shape === 'roundRect' ? MIN_HEIGHT_RATIO_ROUND_RECT : MIN_HEIGHT_RATIO_ELLIPSE;
}

/** Prefer rounded rects when vertical dialogue space is tight. */
export function pickBubbleShape(
  panelHeight: number,
  dialogueZoneHeight: number,
  maxHalfH: number,
): BubbleShape {
  if (dialogueZoneHeight < 72 || panelHeight < 96 || maxHalfH < 28) {
    return 'roundRect';
  }
  return 'ellipse';
}

function minHalfWForText(fontSize: number, padding: BubblePadding, minChars = 1): number {
  const charW = charWidthForFont(fontSize);
  return (minChars * charW + padding.padX * 2) / 2;
}

export function charWidthForFont(fontSize: number): number {
  return fontSize * 0.56;
}

export function lineHeightForFont(fontSize: number): number {
  return fontSize * 1.28;
}

export function maxCharsForWidth(
  availableWidth: number,
  fontSize: number,
  padding: BubblePadding = BUBBLE_PADDING_STANDARD,
): number {
  const inner = Math.max(1, availableWidth - padding.padX * 2);
  return Math.max(1, Math.floor(inner / charWidthForFont(fontSize)));
}

export function bubbleTextBlockHeight(
  lineCount: number,
  lineHeight: number,
  fontSize: number,
): number {
  if (lineCount <= 0) return 0;
  return (lineCount - 1) * lineHeight + fontSize;
}

export function wrapDialogueText(
  content: string,
  maxChars: number,
  maxLines = 6,
): string[] {
  const effectiveMaxChars = Math.max(1, maxChars);
  const words = content.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > effectiveMaxChars && current) {
      lines.push(current);
      current = word;
    } else if (candidate.length > effectiveMaxChars) {
      lines.push(candidate.slice(0, effectiveMaxChars));
      current = '';
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const capped = lines.slice(0, maxLines);
  if (lines.length > maxLines && capped.length > 0) {
    const last = capped[capped.length - 1]!;
    capped[capped.length - 1] = last.length > 1 ? `${last.slice(0, Math.max(1, effectiveMaxChars - 1))}…` : '…';
  }
  return capped;
}

function neededHalfHForLines(
  lineCount: number,
  lineHeight: number,
  fontSize: number,
  padding: BubblePadding,
): number {
  const textH = bubbleTextBlockHeight(lineCount, lineHeight, fontSize);
  return (textH + padding.padY * 2) / 2;
}

export function bubbleMetricsForLines(
  lines: string[],
  options?: { fontSize?: number; maxHalfW?: number; padding?: BubblePadding; shape?: BubbleShape },
): BubbleMetrics {
  const fontSize = options?.fontSize ?? BUBBLE_FONT_SIZE;
  const padding = options?.padding ?? BUBBLE_PADDING_STANDARD;
  const shape = options?.shape ?? 'ellipse';
  const maxAspect = maxAspectForShape(shape);
  const minHeightRatio = minHeightRatioForShape(shape);
  const lineHeight = lineHeightForFont(fontSize);
  const charWidth = charWidthForFont(fontSize);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const lineCount = Math.max(lines.length, 1);
  const minHalfW = options?.maxHalfW != null ? Math.min(12, options.maxHalfW) : 12;
  let halfW = Math.max(minHalfW, (longest * charWidth + padding.padX * 2) / 2);
  let halfH = Math.max(14, neededHalfHForLines(lineCount, lineHeight, fontSize, padding));
  if (options?.maxHalfW != null) {
    halfW = Math.min(halfW, options.maxHalfW);
  }

  const neededHalfH = neededHalfHForLines(lineCount, lineHeight, fontSize, padding);
  if (halfH < neededHalfH) {
    halfH = neededHalfH;
  }
  if (halfH > halfW * maxAspect) {
    const widenedHalfW = Math.min(options?.maxHalfW ?? halfW, neededHalfH / maxAspect);
    halfW = Math.max(halfW, widenedHalfW);
    halfH = Math.min(neededHalfH, halfW * maxAspect);
  }

  halfH = Math.max(halfH, halfW * minHeightRatio);
  if (halfH > halfW * maxAspect) {
    halfH = halfW * maxAspect;
  }

  return { halfW, halfH, fontSize, lineHeight, padX: padding.padX, padY: padding.padY, shape };
}

function bubblePaddingFromMetrics(metrics: BubbleMetrics): BubblePadding {
  return { padX: metrics.padX, padY: metrics.padY };
}

function innerBubbleBounds(metrics: BubbleMetrics): { innerW: number; innerH: number } {
  return {
    innerW: metrics.halfW * 2 - metrics.padX * 2,
    innerH: metrics.halfH * 2 - metrics.padY * 2,
  };
}

function linesFitBubble(
  lines: string[],
  metrics: BubbleMetrics,
): boolean {
  const { innerW, innerH } = innerBubbleBounds(metrics);
  if (innerW <= 0 || innerH <= 0) return false;
  const charW = charWidthForFont(metrics.fontSize);
  const textH = bubbleTextBlockHeight(lines.length, metrics.lineHeight, metrics.fontSize);
  const fitsWidth = lines.every((line) => line.length * charW <= innerW + 0.5);
  const fitsHeight = textH <= innerH + 0.5;
  const aspectOk =
    metrics.halfH / Math.max(metrics.halfW, 1) <= maxAspectForShape(metrics.shape) + 0.02;
  return fitsWidth && fitsHeight && aspectOk;
}

function truncateLineToWidth(line: string, maxChars: number): string {
  if (line.length <= maxChars) return line;
  if (maxChars <= 1) return '…';
  return `${line.slice(0, Math.max(1, maxChars - 1))}…`;
}

function wrapAndClampLines(
  content: string,
  maxChars: number,
  lineCap: number,
): string[] {
  return wrapDialogueText(content, maxChars, lineCap).map((line) =>
    truncateLineToWidth(line, maxChars),
  );
}

function clampBubbleAspect(metrics: BubbleMetrics, maxHalfW: number): BubbleMetrics {
  const minAspect = minHeightRatioForShape(metrics.shape);
  const aspect = metrics.halfH / Math.max(metrics.halfW, 1);
  if (aspect + 1e-6 >= minAspect) return metrics;
  return { ...metrics, halfW: Math.min(maxHalfW, metrics.halfH / minAspect) };
}

function refitLinesForMetrics(
  content: string,
  metrics: BubbleMetrics,
  lineCap: number,
): { lines: string[]; metrics: BubbleMetrics } {
  const padding = bubblePaddingFromMetrics(metrics);
  const maxChars = maxCharsForWidth(metrics.halfW * 2, metrics.fontSize, padding);
  const lines = wrapAndClampLines(content, maxChars, lineCap);
  const next = bubbleMetricsForLines(lines, {
    fontSize: metrics.fontSize,
    maxHalfW: metrics.halfW,
    padding,
    shape: metrics.shape,
  });
  return { lines, metrics: { ...next, padX: padding.padX, padY: padding.padY, shape: metrics.shape } };
}

function buildBubbleFromLines(
  lines: string[],
  metrics: BubbleMetrics,
  maxHalfW: number,
  maxHalfH: number,
): BubbleMetrics {
  const padding = bubblePaddingFromMetrics(metrics);
  const neededHalfH = neededHalfHForLines(
    lines.length,
    metrics.lineHeight,
    metrics.fontSize,
    padding,
  );
  const halfW = Math.min(metrics.halfW, maxHalfW);
  const halfH = Math.min(Math.max(neededHalfH, metrics.halfH), maxHalfH);
  let next = clampBubbleAspect(
    { ...metrics, halfW, halfH, padX: padding.padX, padY: padding.padY },
    maxHalfW,
  );
  if (neededHalfH > maxHalfH + 0.5) {
    return next;
  }
  next = { ...next, halfH: Math.min(maxHalfH, Math.max(neededHalfH, next.halfH)) };
  return clampBubbleAspect(next, maxHalfW);
}

/** Guaranteed single-line fit for impossible stacks (compact padding + ellipsis). */
function hardFitBubbleToBox(
  content: string,
  maxHalfW: number,
  maxHalfH: number,
  panelInnerWidth: number,
  shape: BubbleShape = 'roundRect',
): { lines: string[]; metrics: BubbleMetrics } {
  for (const padding of PADDING_TIERS) {
    for (let fontSize = BUBBLE_FONT_SIZE; fontSize >= HARD_MIN_FONT_SIZE; fontSize--) {
      const halfW = Math.min(
        maxHalfW,
        Math.max(minHalfWForText(fontSize, padding), panelInnerWidth / 2, 6),
      );
      const maxChars = maxCharsForWidth(halfW * 2, fontSize, padding);
      const lines = wrapAndClampLines(content, maxChars, 1);
      const lineHeight = lineHeightForFont(fontSize);
      const neededHalfH = neededHalfHForLines(1, lineHeight, fontSize, padding);
      if (neededHalfH > maxHalfH + 0.5) continue;
      const metrics = clampBubbleAspect(
        {
          halfW,
          halfH: neededHalfH,
          fontSize,
          lineHeight,
          padX: padding.padX,
          padY: padding.padY,
          shape,
        },
        maxHalfW,
      );
      if (linesFitBubble(lines, metrics)) {
        return { lines, metrics };
      }
    }
  }

  const padding = BUBBLE_PADDING_MICRO;
  const halfW = Math.min(
    maxHalfW,
    Math.max(minHalfWForText(HARD_MIN_FONT_SIZE, padding), panelInnerWidth / 2, 6),
  );
  for (let fontSize = HARD_MIN_FONT_SIZE; fontSize >= HARD_MIN_FONT_SIZE; fontSize--) {
    const lineHeight = lineHeightForFont(fontSize);
    const maxChars = Math.max(1, maxCharsForWidth(halfW * 2, fontSize, padding));
    const lines = [truncateLineToWidth(content.trim() || '…', maxChars)];
    const neededHalfH = neededHalfHForLines(1, lineHeight, fontSize, padding);
    if (neededHalfH > maxHalfH + 0.5) continue;
    const metrics = clampBubbleAspect(
      {
        halfW,
        halfH: neededHalfH,
        fontSize,
        lineHeight,
        padX: padding.padX,
        padY: padding.padY,
        shape,
      },
      maxHalfW,
    );
    if (linesFitBubble(lines, metrics)) {
      return { lines, metrics };
    }
  }

  const fontSize = HARD_MIN_FONT_SIZE;
  const lineHeight = lineHeightForFont(fontSize);
  const lines = ['…'];
  const neededHalfH = neededHalfHForLines(1, lineHeight, fontSize, padding);
  const metrics = clampBubbleAspect(
    {
      halfW,
      halfH: Math.min(maxHalfH, Math.max(neededHalfH, 3)),
      fontSize,
      lineHeight,
      padX: padding.padX,
      padY: padding.padY,
      shape,
    },
    maxHalfW,
  );
  return { lines, metrics };
}

/** Fit dialogue into panel width, shrinking font and re-wrapping until lines fit. */
export function fitDialogueLines(
  content: string,
  maxHalfW: number,
  panelInnerWidth: number,
  maxFontSize = BUBBLE_FONT_SIZE,
  maxLines = 6,
  shape: BubbleShape = 'ellipse',
): { lines: string[]; metrics: BubbleMetrics } {
  const fontFloor = shape === 'roundRect' ? MIN_FONT_SIZE : BUBBLE_MIN_READABLE_FONT;
  for (const padding of PADDING_TIERS) {
    let fontSize = maxFontSize;
    while (fontSize >= fontFloor) {
      const wrapWidth = Math.min(panelInnerWidth, maxHalfW * 2);
      let maxChars = maxCharsForWidth(wrapWidth, fontSize, padding);
      let lines = wrapAndClampLines(content, maxChars, maxLines);
      let metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW, padding, shape });
      maxChars = maxCharsForWidth(metrics.halfW * 2, metrics.fontSize, padding);
      lines = wrapAndClampLines(content, maxChars, maxLines);
      metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW, padding, shape });
      if (linesFitBubble(lines, metrics)) return { lines, metrics };
      fontSize -= 1;
    }
  }

  return hardFitBubbleToBox(content, maxHalfW, maxHalfW * 1.15, panelInnerWidth, shape);
}

/** Refit dialogue when vertical stack caps bubble height (shrink font / lines until text fits). */
export function fitDialogueLinesWithinHalfH(
  content: string,
  maxHalfW: number,
  maxHalfH: number,
  panelInnerWidth: number,
  maxFontSize = BUBBLE_FONT_SIZE,
  shape: BubbleShape = 'ellipse',
): { lines: string[]; metrics: BubbleMetrics } {
  const fontFloor = shape === 'roundRect' ? MIN_FONT_SIZE : BUBBLE_MIN_READABLE_FONT;
  for (const padding of PADDING_TIERS) {
    let fontSize = maxFontSize;
    while (fontSize >= fontFloor) {
      for (let lineCap = 6; lineCap >= 1; lineCap--) {
        const wrapWidth = Math.min(panelInnerWidth, maxHalfW * 2);
        let maxChars = maxCharsForWidth(wrapWidth, fontSize, padding);
        let lines = wrapAndClampLines(content, maxChars, lineCap);
        let metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW, padding, shape });
        maxChars = maxCharsForWidth(Math.min(metrics.halfW, maxHalfW) * 2, fontSize, padding);
        lines = wrapAndClampLines(content, maxChars, lineCap);
        metrics = buildBubbleFromLines(lines, metrics, maxHalfW, maxHalfH);
        ({ lines, metrics } = refitLinesForMetrics(content, metrics, lineCap));
        metrics = buildBubbleFromLines(lines, metrics, maxHalfW, maxHalfH);
        if (linesFitBubble(lines, metrics)) {
          return { lines, metrics };
        }
      }
      fontSize -= 1;
    }
  }

  return hardFitBubbleToBox(content, maxHalfW, maxHalfH, panelInnerWidth, shape);
}

/** @deprecated Use fitDialogueLines */
export function fitBubbleMetrics(
  lines: string[],
  maxHalfW: number,
): BubbleMetrics {
  let fontSize = BUBBLE_FONT_SIZE;
  let metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW });
  while (metrics.halfW > maxHalfW && fontSize > MIN_FONT_SIZE) {
    fontSize -= 1;
    metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW });
  }
  if (metrics.halfW > maxHalfW) {
    metrics = {
      ...metrics,
      halfW: maxHalfW,
      halfH: Math.min(metrics.halfH, maxHalfW * maxAspectForShape(metrics.shape)),
      padX: metrics.padX,
      padY: metrics.padY,
      shape: metrics.shape,
    };
  }
  return metrics;
}

export type TailMouthGeometry = {
  angle: number;
  spread: number;
  left: { x: number; y: number };
  right: { x: number; y: number };
  tip: { x: number; y: number };
};

function ellipsePoint(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  angle: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(angle) * halfW,
    y: cy + Math.sin(angle) * halfH,
  };
}

function tailMouthSpread(halfW: number, halfH: number, distance: number): number {
  const aspect = halfH / Math.max(halfW, 1);
  let base = Math.min(0.38, Math.max(0.12, 7 / Math.max(halfW, halfH)));
  if (aspect < 0.38) {
    base *= 0.48;
  }
  if (distance < Math.max(halfH, halfW) * 1.4) {
    return base * 0.62;
  }
  return base;
}

/** Mouth points + tail tip for layout/quality checks. */
export function tailMouthGeometry(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): TailMouthGeometry {
  const dx = tailX - cx;
  const dy = tailY - cy;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const spread = tailMouthSpread(halfW, halfH, distance);
  return {
    angle,
    spread,
    left: ellipsePoint(cx, cy, halfW, halfH, angle - spread),
    right: ellipsePoint(cx, cy, halfW, halfH, angle + spread),
    tip: { x: tailX, y: tailY },
  };
}

/**
 * True when the straight chord between mouth points cuts through the bubble interior
 * (legacy path bug — tail stroke crossed dialogue text).
 */
export function tailMouthChordCrossesInterior(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): boolean {
  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
  const midX = (mouth.left.x + mouth.right.x) / 2;
  const midY = (mouth.left.y + mouth.right.y) / 2;
  const nx = (midX - cx) / Math.max(halfW, 1);
  const ny = (midY - cy) / Math.max(halfH, 1);
  return nx * nx + ny * ny < 0.62;
}

/** Nudge dialogue upward when the tail exits from the lower arc. */
export function bubbleTextOffsetY(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
  shape: BubbleShape = 'ellipse',
): number {
  const angle = Math.atan2(tailY - cy, tailX - cx);
  if (Math.sin(angle) <= 0.2) return 0;
  if (shape === 'roundRect') {
    return -Math.min(halfH * 0.18, 6);
  }
  const spread = tailMouthSpread(halfW, halfH, Math.hypot(tailX - cx, tailY - cy));
  return -Math.min(halfH * 0.2, halfH * Math.sin(spread) * 0.65);
}

/**
 * Rounded-rectangle body with a smooth cubic tail aimed at the speaker.
 * Attachment stays near the bottom-center so sideways tips don't form sharp elbows.
 */
export function roundRectBubblePathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): string {
  const left = cx - halfW;
  const right = cx + halfW;
  const top = cy - halfH;
  const bottom = cy + halfH;
  const rad = Math.min(halfH * 0.82, halfW * 0.18, 12);
  // Keep mouth near the center — far lateral attach + tip creates zig-zag elbows.
  const maxOffset = halfW * 0.42;
  const attachX = Math.min(cx + maxOffset, Math.max(cx - maxOffset, (cx * 0.55 + tailX * 0.45)));
  const mouthHalf = Math.min(7, halfW * 0.11, Math.max(3.5, halfH * 0.4));
  const mL = { x: attachX - mouthHalf, y: bottom };
  const mR = { x: attachX + mouthHalf, y: bottom };
  const tip = { x: tailX, y: tailY };
  const midMouthX = (mL.x + mR.x) / 2;
  const dist = Math.hypot(tip.x - midMouthX, tip.y - bottom);
  const angle = Math.atan2(tip.y - bottom, tip.x - midMouthX);
  const bulge = Math.min(16, Math.max(6, dist * 0.28));
  const midX = midMouthX + Math.cos(angle) * bulge;
  const midY = bottom + Math.sin(angle) * bulge + bulge * 0.15;

  let path = `M ${mL.x} ${mL.y}`;
  path += ` L ${left + rad} ${bottom}`;
  path += ` Q ${left} ${bottom} ${left} ${bottom - rad}`;
  path += ` L ${left} ${top + rad}`;
  path += ` Q ${left} ${top} ${left + rad} ${top}`;
  path += ` L ${right - rad} ${top}`;
  path += ` Q ${right} ${top} ${right} ${top + rad}`;
  path += ` L ${right} ${bottom - rad}`;
  path += ` Q ${right} ${bottom} ${right - rad} ${bottom}`;
  path += ` L ${mR.x} ${mR.y}`;
  // Two cubic sides with distinct control points (same pattern as ellipse tails).
  const c1x = mR.x + (midX - mR.x) * 0.45;
  const c1y = mR.y + (midY - mR.y) * 0.45;
  const c2x = tip.x + (midX - tip.x) * 0.35;
  const c2y = tip.y + (midY - tip.y) * 0.35;
  path += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${tip.x} ${tip.y}`;
  const c3x = tip.x + (midX - tip.x) * 0.35;
  const c3y = tip.y + (midY - tip.y) * 0.35;
  const c4x = mL.x + (midX - mL.x) * 0.45;
  const c4y = mL.y + (midY - mL.y) * 0.45;
  path += ` C ${c3x} ${c3y} ${c4x} ${c4y} ${mL.x} ${mL.y}`;
  path += ' Z';
  return path;
}

/**
 * Ellipse body with an integrated tail wedge aimed at (tailX, tailY).
 * The body follows the ellipse arc between mouth points; the tail never chords through the interior.
 */
export function speechBubblePathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): string {
  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
  const { left, right, tip, angle, spread } = mouth;
  const distance = Math.hypot(tip.x - cx, tip.y - cy);
  const bodySpan = 2 * Math.PI - spread * 2;
  const bodySteps = 28;

  let path = `M ${left.x} ${left.y}`;
  for (let step = 1; step <= bodySteps; step++) {
    const t = angle - spread + (step / bodySteps) * bodySpan;
    const point = ellipsePoint(cx, cy, halfW, halfH, t);
    path += ` L ${point.x} ${point.y}`;
  }

  const bulge = Math.min(14, Math.max(6, distance * 0.2, halfH * 0.55));
  const midX = cx + Math.cos(angle) * (Math.max(halfW, halfH) + bulge * 0.25);
  const midY = cy + Math.sin(angle) * (Math.max(halfW, halfH) + bulge * 0.25);

  const c1x = right.x + (midX - right.x) * 0.5;
  const c1y = right.y + (midY - right.y) * 0.5;
  const c2x = tip.x + (midX - tip.x) * 0.35;
  const c2y = tip.y + (midY - tip.y) * 0.35;
  path += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${tip.x} ${tip.y}`;

  const c3x = tip.x + (midX - tip.x) * 0.35;
  const c3y = tip.y + (midY - tip.y) * 0.35;
  const c4x = left.x + (midX - left.x) * 0.5;
  const c4y = left.y + (midY - left.y) * 0.5;
  path += ` C ${c3x} ${c3y} ${c4x} ${c4y} ${left.x} ${left.y}`;
  path += ' Z';
  return path;
}

export function speechBubblePathForLayout(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
  shape: BubbleShape = 'ellipse',
): string {
  if (shape === 'roundRect') {
    return roundRectBubblePathD(cx, cy, halfW, halfH, tailX, tailY);
  }
  return speechBubblePathD(cx, cy, halfW, halfH, tailX, tailY);
}

export function bubbleBodyBBox(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  };
}
