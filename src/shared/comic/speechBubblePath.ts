/** Comic speech bubble path + text-aware sizing. */

export const BUBBLE_FONT_SIZE = 11;
export const BUBBLE_MIN_READABLE_FONT = 9;
export const BUBBLE_FONT_FAMILY = '"Comic Sans MS", "Comic Neue", cursive, sans-serif';
/** Comfortable balsamiq balloon padding — keep readable bubbles from feeling letterboxed. */
export const BUBBLE_PAD_X = 14;
export const BUBBLE_PAD_Y = 12;
export const BUBBLE_PAD_X_COMPACT = 11;
export const BUBBLE_PAD_Y_COMPACT = 9;
const MAX_ASPECT_ELLIPSE = 0.55;
const MAX_ASPECT_ROUND_RECT = 0.72;
const MIN_HEIGHT_RATIO_ELLIPSE = 0.28;
/** Slightly less tall-for-width so short lines don’t float in empty air. */
const MIN_HEIGHT_RATIO_ROUND_RECT = 0.3;
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

export const BUBBLE_PADDING_MINIMAL: BubblePadding = { padX: 9, padY: 7 };
export const BUBBLE_PADDING_MICRO: BubblePadding = { padX: 7, padY: 5 };

/** Normal fit prefers breathable padding; MICRO is hard-fit only. */
const PADDING_TIERS: BubblePadding[] = [
  BUBBLE_PADDING_STANDARD,
  BUBBLE_PADDING_COMPACT,
  BUBBLE_PADDING_MINIMAL,
];

const HARD_FIT_PADDING_TIERS: BubblePadding[] = [...PADDING_TIERS, BUBBLE_PADDING_MICRO];

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

/**
 * Phase 1: rounded rectangles are the forced default body shape for all new layouts.
 * Ellipse is retained only for explicit/legacy callers — it is never picked here.
 */
export function pickBubbleShape(
  panelHeight: number,
  dialogueZoneHeight: number,
  maxHalfH: number,
): BubbleShape {
  if (panelHeight <= 0 && dialogueZoneHeight <= 0 && maxHalfH <= 0) {
    return 'roundRect';
  }
  return 'roundRect';
}

function minHalfWForText(fontSize: number, padding: BubblePadding, minChars = 1): number {
  const charW = charWidthForFont(fontSize);
  return (minChars * charW + padding.padX * 2) / 2;
}

export function charWidthForFont(fontSize: number): number {
  // Wide vs Comic Sans averages so SVG paint rarely exceeds the padded inner width.
  return fontSize * 0.58;
}

/** True when displayed lines omit part of the source dialogue (ellipsis / line cap). */
export function isDialogueDisplayTruncated(content: string, lines: string[]): boolean {
  const source = content.trim().replace(/\s+/g, ' ');
  if (!source) return false;
  const displayed = lines
    .join(' ')
    .replace(/…/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (lines.some((line) => line.includes('…')) && displayed.length < source.length) {
    return true;
  }
  // Reconstruct without ellipsis markers — any shorter display means truncation.
  const sourceCompact = source.replace(/\s+/g, '');
  const displayedCompact = displayed.replace(/\s+/g, '');
  return displayedCompact.length > 0 && displayedCompact.length < sourceCompact.length;
}

export function lineHeightForFont(fontSize: number): number {
  // A hair looser than 1.28 so multi-line balloons breathe inside the pad box.
  return fontSize * 1.32;
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
  // Descenders + roundRect bottom mouth notch — keep glyphs inside the stroke.
  return (lineCount - 1) * lineHeight + fontSize * 1.24;
}

/** Prefer even line lengths so centered dialogue doesn’t look left- or right-heavy. */
function balanceTwoLineWrap(lines: string[], maxChars: number): string[] {
  if (lines.length !== 2) return lines;
  const words = [...lines[0]!.split(/\s+/), ...lines[1]!.split(/\s+/)].filter(Boolean);
  if (words.length < 2) return lines;
  let best = lines;
  let bestScore = Math.abs(lines[0]!.length - lines[1]!.length);
  for (let split = 1; split < words.length; split++) {
    const a = words.slice(0, split).join(' ');
    const b = words.slice(split).join(' ');
    if (a.length > maxChars || b.length > maxChars) continue;
    const score = Math.abs(a.length - b.length);
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

export function wrapDialogueText(
  content: string,
  maxChars: number,
  maxLines = 8,
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
  if (capped.length === 2) return balanceTwoLineWrap(capped, effectiveMaxChars);
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
  const shape = options?.shape ?? 'roundRect';
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
  halfH = Math.max(halfH, neededHalfH, halfW * minHeightRatio);

  // Prefer widening over shrinking height — short halfH is what clips dialogue into the stroke.
  if (halfH > halfW * maxAspect) {
    const widenedHalfW = neededHalfH / maxAspect;
    const maxW = options?.maxHalfW ?? widenedHalfW;
    halfW = Math.max(halfW, Math.min(maxW, widenedHalfW));
    halfH = Math.max(neededHalfH, Math.min(halfH, halfW * maxAspect));
    // If still capped by maxHalfW, keep text height (upstream fit will shrink font / wrap).
    if (halfH < neededHalfH) halfH = neededHalfH;
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
  /* If text needs more height than allowed, keep halfH capped so linesFitBubble fails and
     the caller re-wraps / shrinks — never paint overflowing glyphs. */
  const halfH =
    neededHalfH > maxHalfH + 0.5
      ? maxHalfH
      : Math.min(maxHalfH, Math.max(neededHalfH, metrics.halfH));
  return clampBubbleAspect(
    { ...metrics, halfW, halfH, padX: padding.padX, padY: padding.padY },
    maxHalfW,
  );
}

/** Guaranteed single-line fit for impossible stacks (compact padding + ellipsis). */
function hardFitBubbleToBox(
  content: string,
  maxHalfW: number,
  maxHalfH: number,
  panelInnerWidth: number,
  shape: BubbleShape = 'roundRect',
): { lines: string[]; metrics: BubbleMetrics } {
  for (const padding of HARD_FIT_PADDING_TIERS) {
    for (let fontSize = BUBBLE_FONT_SIZE; fontSize >= HARD_MIN_FONT_SIZE; fontSize--) {
      const halfW = Math.min(
        maxHalfW,
        Math.max(minHalfWForText(fontSize, padding), panelInnerWidth / 2, 6),
      );
      const lineHeight = lineHeightForFont(fontSize);
      const maxLinesForH = Math.max(
        1,
        Math.floor((maxHalfH * 2 - padding.padY * 2) / Math.max(lineHeight, fontSize * 1.24)),
      );
      const maxChars = maxCharsForWidth(halfW * 2, fontSize, padding);
      const lines = wrapAndClampLines(content, maxChars, maxLinesForH);
      const neededHalfH = neededHalfHForLines(lines.length, lineHeight, fontSize, padding);
      if (neededHalfH > maxHalfH + 0.5) continue;
      const metrics = clampBubbleAspect(
        {
          halfW,
          halfH: Math.min(maxHalfH, neededHalfH),
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
    /* Prefer a short readable phrase over a glyph that paints outside the stroke. */
    const maxLinesForH = Math.max(
      1,
      Math.floor((maxHalfH * 2 - padding.padY * 2) / Math.max(lineHeight, fontSize * 1.24)),
    );
    const lines = wrapAndClampLines(content.trim() || '…', maxChars, maxLinesForH);
    const neededHalfH = neededHalfHForLines(lines.length, lineHeight, fontSize, padding);
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
  maxLines = 8,
  shape: BubbleShape = 'roundRect',
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
  shape: BubbleShape = 'roundRect',
): { lines: string[]; metrics: BubbleMetrics } {
  const fontFloor = shape === 'roundRect' ? MIN_FONT_SIZE : BUBBLE_MIN_READABLE_FONT;
  for (const padding of PADDING_TIERS) {
    let fontSize = maxFontSize;
    while (fontSize >= fontFloor) {
      for (let lineCap = 8; lineCap >= 1; lineCap--) {
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
  // Wider mouths read as comic wedges; thin mouths become spaghetti on long reaches.
  let base = Math.min(0.5, Math.max(0.2, 11 / Math.max(halfW, halfH)));
  if (aspect < 0.38) {
    base *= 0.72;
  }
  if (distance > Math.max(halfH, halfW) * 2.8) {
    base = Math.min(0.55, base * 1.2);
  } else if (distance < Math.max(halfH, halfW) * 1.25) {
    base *= 0.78;
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

/**
 * Vertical offset added to the geometric first-line center
 * (`cy - (lineCount - 1) * lineHeight / 2`) when `dominantBaseline="middle"`.
 *
 * Keep near zero — a downward settle previously ate bottom padY and clipped the last line
 * into the roundRect stroke / tail mouth. Sizing already includes descender slack.
 */
export function bubbleTextOffsetY(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
  shape: BubbleShape = 'roundRect',
  padY: number = BUBBLE_PAD_Y,
  fontSize: number = BUBBLE_FONT_SIZE,
): number {
  void cx;
  void cy;
  void halfW;
  void halfH;
  void padY;
  void shape;
  void tailX;
  void tailY;
  void fontSize;
  return 0;
}

/**
 * `body` is the single continuous balloon outline (bubble + tail, one stroke).
 * `tail` is empty in the unified path model (kept for API / legacy validators).
 */
export type BubblePathPair = { body: string; tail: string };

/** Mouth + tip for roundRect tails (bottom attach) — used by path build and overlap checks. */
export function roundRectTailMouth(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): TailMouthGeometry {
  const bottom = cy + halfH;
  const left = cx - halfW;
  const right = cx + halfW;
  const rad = Math.min(halfH * 0.88, halfW * 0.22, 13);
  // Mouth on the bottom edge — unified outline never strokes a chord across the join.
  const attachY = bottom;
  const maxOffset = halfW * 0.42;
  let attachX = Math.min(cx + maxOffset, Math.max(cx - maxOffset, cx * 0.55 + tailX * 0.45));
  const distToTip = Math.hypot(tailX - attachX, tailY - attachY);
  const mouthHalf = Math.min(
    halfW * 0.3,
    Math.max(7, Math.min(15, halfH * 0.7 + Math.min(5, distToTip * 0.02))),
  );
  const minX = left + rad + 1;
  const maxX = right - rad - 1;
  attachX = Math.min(maxX - mouthHalf, Math.max(minX + mouthHalf, attachX));
  const dx = tailX - attachX;
  const dy = tailY - attachY;
  const angle = Math.atan2(dy, dx);
  return {
    angle,
    spread: mouthHalf / Math.max(halfW, 1),
    left: { x: attachX - mouthHalf, y: attachY },
    right: { x: attachX + mouthHalf, y: attachY },
    tip: { x: tailX, y: tailY },
  };
}

/** Pure closed rounded-rectangle body — no tail notch cut into the outline. */
export function roundRectBubbleBodyPathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): string {
  const left = cx - halfW;
  const right = cx + halfW;
  const top = cy - halfH;
  const bottom = cy + halfH;
  // Soft comic-balloon corners — still sketchy, not stadium-pill.
  const rad = Math.min(halfH * 0.88, halfW * 0.22, 13);

  let path = `M ${left + rad} ${top}`;
  path += ` L ${right - rad} ${top}`;
  path += ` Q ${right} ${top} ${right} ${top + rad}`;
  path += ` L ${right} ${bottom - rad}`;
  path += ` Q ${right} ${bottom} ${right - rad} ${bottom}`;
  path += ` L ${left + rad} ${bottom}`;
  path += ` Q ${left} ${bottom} ${left} ${bottom - rad}`;
  path += ` L ${left} ${top + rad}`;
  path += ` Q ${left} ${top} ${left + rad} ${top}`;
  path += ' Z';
  return path;
}

/**
 * Co-directional cubic sides for a tail (mouthRight → tip → mouthLeft), no Z.
 */
function curvedTailPathSegment(
  mouthLeft: { x: number; y: number },
  mouthRight: { x: number; y: number },
  tip: { x: number; y: number },
  options?: { maxBend?: number },
): string {
  const midMouthX = (mouthLeft.x + mouthRight.x) / 2;
  const midMouthY = (mouthLeft.y + mouthRight.y) / 2;
  const dx = tip.x - midMouthX;
  const dy = tip.y - midMouthY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-3) {
    return ` L ${tip.x} ${tip.y} L ${mouthLeft.x} ${mouthLeft.y}`;
  }
  const angle = Math.atan2(dy, dx);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const lateral = dx === 0 ? (midMouthX >= tip.x ? -1 : 1) : Math.sign(dx);
  const maxBend = options?.maxBend ?? 10;
  const bendAmt =
    dist > 90 ? Math.min(5.5, Math.max(2.5, dist * 0.04)) : Math.min(maxBend, Math.max(3.5, dist * 0.11));
  const flowX = perpX * bendAmt * lateral;
  const flowY = perpY * bendAmt * lateral;
  const along = (t: number) => ({
    x: midMouthX + dx * t,
    y: midMouthY + dy * t,
  });
  const spineA = along(0.32);
  const spineB = along(0.68);
  const c1x = spineA.x + flowX + (mouthRight.x - midMouthX) * 0.35;
  const c1y = spineA.y + flowY + (mouthRight.y - midMouthY) * 0.15;
  const c2x = spineB.x + flowX * 0.35;
  const c2y = spineB.y + flowY * 0.35;
  const c3x = spineB.x + flowX * 0.35;
  const c3y = spineB.y + flowY * 0.35;
  const c4x = spineA.x + flowX + (mouthLeft.x - midMouthX) * 0.35;
  const c4y = spineA.y + flowY + (mouthLeft.y - midMouthY) * 0.15;
  return (
    ` C ${c1x} ${c1y} ${c2x} ${c2y} ${tip.x} ${tip.y}` +
    ` C ${c3x} ${c3y} ${c4x} ${c4y} ${mouthLeft.x} ${mouthLeft.y}`
  );
}

/** Closed filled-tail wedge (legacy helper / overlap probes). */
function curvedFilledTailPathD(
  mouthLeft: { x: number; y: number },
  mouthRight: { x: number; y: number },
  tip: { x: number; y: number },
  options?: { maxBend?: number },
): string {
  return (
    `M ${mouthRight.x} ${mouthRight.y}` +
    curvedTailPathSegment(mouthLeft, mouthRight, tip, options) +
    ' Z'
  );
}

/**
 * One continuous outline: round-rect perimeter with a notched bottom that
 * swoops out to the tip and back — single stroke, no mouth-chord seam.
 */
export function roundRectBubbleUnifiedPathD(
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
  const rad = Math.min(halfH * 0.88, halfW * 0.22, 13);
  const mouth = roundRectTailMouth(cx, cy, halfW, halfH, tailX, tailY);
  const mL = mouth.left;
  const mR = mouth.right;
  const tip = mouth.tip;

  let path = `M ${left + rad} ${top}`;
  path += ` L ${right - rad} ${top}`;
  path += ` Q ${right} ${top} ${right} ${top + rad}`;
  path += ` L ${right} ${bottom - rad}`;
  path += ` Q ${right} ${bottom} ${right - rad} ${bottom}`;
  path += ` L ${mR.x} ${mR.y}`;
  path += curvedTailPathSegment(mL, mR, tip);
  path += ` L ${left + rad} ${bottom}`;
  path += ` Q ${left} ${bottom} ${left} ${bottom - rad}`;
  path += ` L ${left} ${top + rad}`;
  path += ` Q ${left} ${top} ${left + rad} ${top}`;
  path += ' Z';
  return path;
}

/**
 * Filled curved tail for a rounded-rect body — closed wedge (unit tests / probes).
 */
export function roundRectBubbleTailPathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tipX: number,
  tipY: number,
): string {
  const mouth = roundRectTailMouth(cx, cy, halfW, halfH, tipX, tipY);
  return curvedFilledTailPathD(mouth.left, mouth.right, mouth.tip);
}

/** Pure closed ellipse body — full arc walked with line segments, no tail notch. */
export function ellipseBubbleBodyPathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): string {
  const steps = 32;
  let path = '';
  for (let step = 0; step <= steps; step++) {
    const t = (step / steps) * 2 * Math.PI;
    const point = ellipsePoint(cx, cy, halfW, halfH, t);
    path += step === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`;
  }
  path += ' Z';
  return path;
}

/**
 * One continuous ellipse outline with a notched mouth that swoops to the tip.
 */
export function ellipseBubbleUnifiedPathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): string {
  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
  const angleR = Math.atan2(mouth.right.y - cy, mouth.right.x - cx);
  const angleL = Math.atan2(mouth.left.y - cy, mouth.left.x - cx);
  // Walk the long way (over the top) from mouth-left to mouth-right, then swoop to tip.
  let end = angleR;
  while (end <= angleL) end += 2 * Math.PI;
  const steps = 36;
  let path = `M ${mouth.left.x} ${mouth.left.y}`;
  for (let step = 1; step <= steps; step++) {
    const t = angleL + ((end - angleL) * step) / steps;
    const point = ellipsePoint(cx, cy, halfW, halfH, t);
    path += ` L ${point.x} ${point.y}`;
  }
  path += curvedTailPathSegment(mouth.left, mouth.right, mouth.tip, { maxBend: 12 });
  path += ' Z';
  return path;
}

/**
 * Filled curved tail for an ellipse body (unit tests / probes).
 */
export function ellipseBubbleTailPathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): string {
  const mouth = tailMouthGeometry(cx, cy, halfW, halfH, tailX, tailY);
  return curvedFilledTailPathD(mouth.left, mouth.right, mouth.tip, { maxBend: 12 });
}

/**
 * Continuous balloon outline in `body` (bubble + tail, one stroke).
 * `tail` is empty — kept on the pair type for validators/e2e.
 */
export function speechBubblePathForLayout(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
  shape: BubbleShape = 'roundRect',
): BubblePathPair {
  if (shape === 'roundRect') {
    return {
      body: roundRectBubbleUnifiedPathD(cx, cy, halfW, halfH, tailX, tailY),
      tail: '',
    };
  }
  return {
    body: ellipseBubbleUnifiedPathD(cx, cy, halfW, halfH, tailX, tailY),
    tail: '',
  };
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
