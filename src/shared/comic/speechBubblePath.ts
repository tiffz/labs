/** Comic speech bubble path + text-aware sizing. */

export const BUBBLE_FONT_SIZE = 11;
export const BUBBLE_FONT_FAMILY = '"Comic Sans MS", "Comic Neue", cursive, sans-serif';
const PAD_X = 12;
const PAD_Y = 10;
const MAX_ASPECT = 0.55;
const MIN_HEIGHT_RATIO = 0.3;
const MIN_FONT_SIZE = 8;

export type BubbleMetrics = {
  halfW: number;
  halfH: number;
  fontSize: number;
  lineHeight: number;
};

export function charWidthForFont(fontSize: number): number {
  return fontSize * 0.56;
}

export function lineHeightForFont(fontSize: number): number {
  return fontSize * 1.28;
}

export function maxCharsForWidth(availableWidth: number, fontSize: number): number {
  const inner = Math.max(8, availableWidth - PAD_X * 2);
  return Math.max(1, Math.floor(inner / charWidthForFont(fontSize)));
}

export function wrapDialogueText(
  content: string,
  maxChars: number,
  maxLines = 6,
): string[] {
  const words = content.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function bubbleMetricsForLines(
  lines: string[],
  options?: { fontSize?: number; maxHalfW?: number },
): BubbleMetrics {
  const fontSize = options?.fontSize ?? BUBBLE_FONT_SIZE;
  const lineHeight = lineHeightForFont(fontSize);
  const charWidth = charWidthForFont(fontSize);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const lineCount = Math.max(lines.length, 1);
  const minHalfW = options?.maxHalfW != null ? Math.min(12, options.maxHalfW) : 12;
  let halfW = Math.max(minHalfW, (longest * charWidth + PAD_X * 2) / 2);
  let halfH = Math.max(14, (lineCount * lineHeight + PAD_Y * 2) / 2);
  if (options?.maxHalfW != null) {
    halfW = Math.min(halfW, options.maxHalfW);
  }
  const maxH = halfW * MAX_ASPECT;
  halfH = Math.min(halfH, maxH);
  halfH = Math.max(halfH, lineCount * (lineHeight * 0.45));
  halfH = Math.max(halfH, halfW * MIN_HEIGHT_RATIO);
  return { halfW, halfH, fontSize, lineHeight };
}

/** Fit dialogue into panel width, shrinking font and re-wrapping until lines fit. */
export function fitDialogueLines(
  content: string,
  maxHalfW: number,
  panelInnerWidth: number,
  maxFontSize = BUBBLE_FONT_SIZE,
  maxLines = 6,
): { lines: string[]; metrics: BubbleMetrics } {
  let fontSize = maxFontSize;
  while (fontSize >= MIN_FONT_SIZE) {
    const wrapWidth = Math.min(panelInnerWidth, maxHalfW * 2);
    let maxChars = maxCharsForWidth(wrapWidth, fontSize);
    let lines = wrapDialogueText(content, maxChars, maxLines);
    let metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW });
    maxChars = maxCharsForWidth(metrics.halfW * 2, metrics.fontSize);
    lines = wrapDialogueText(content, maxChars, maxLines).map((line) =>
      line.length > maxChars ? line.slice(0, maxChars) : line,
    );
    metrics = bubbleMetricsForLines(lines, { fontSize, maxHalfW });
    const inner = metrics.halfW * 2 - 8;
    const fits = lines.every((line) => line.length * charWidthForFont(metrics.fontSize) <= inner);
    if (fits) return { lines, metrics };
    fontSize -= 1;
  }

  const wrapWidth = Math.min(panelInnerWidth, maxHalfW * 2);
  const maxChars = Math.max(1, maxCharsForWidth(wrapWidth, MIN_FONT_SIZE));
  const lines = wrapDialogueText(content, maxChars, maxLines).map((line) =>
    line.length > maxChars ? line.slice(0, maxChars) : line,
  );
  const metrics = bubbleMetricsForLines(lines, { fontSize: MIN_FONT_SIZE, maxHalfW });
  return { lines, metrics };
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
    metrics = { ...metrics, halfW: maxHalfW, halfH: Math.min(metrics.halfH, maxHalfW * MAX_ASPECT) };
  }
  return metrics;
}

/** Ellipse body with a curved tail aimed at (tailX, tailY). */
export function speechBubblePathD(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): string {
  const dx = tailX - cx;
  const dy = tailY - cy;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const attachX = cx + Math.cos(angle) * halfW * 0.92;
  const attachY = cy + Math.sin(angle) * halfH * 0.92;
  const tailHalf = Math.min(14, Math.max(6, halfW * 0.22, distance * 0.05));
  const perpX = -Math.sin(angle) * tailHalf;
  const perpY = Math.cos(angle) * tailHalf;
  const left = cx - halfW;
  const right = cx + halfW;

  const body = [
    `M ${left} ${cy}`,
    `A ${halfW} ${halfH} 0 1 0 ${right} ${cy}`,
    `A ${halfW} ${halfH} 0 1 0 ${left} ${cy}`,
  ];

  if (distance > Math.max(halfH * 2.2, 36)) {
    const midX = attachX + (tailX - attachX) * 0.45;
    const midY = attachY + (tailY - attachY) * 0.45;
    const bend = Math.min(20, distance * 0.08);
    const ctrlX = midX + (perpX / tailHalf) * bend;
    const ctrlY = midY + (perpY / tailHalf) * bend;
    return [
      ...body,
      `L ${attachX + perpX} ${attachY + perpY}`,
      `Q ${ctrlX} ${ctrlY} ${midX} ${midY}`,
      `Q ${tailX - perpX * 0.35} ${tailY - perpY * 0.35} ${tailX} ${tailY}`,
      `L ${attachX - perpX} ${attachY - perpY}`,
      'Z',
    ].join(' ');
  }

  return [
    ...body,
    `L ${attachX + perpX} ${attachY + perpY}`,
    `Q ${(attachX + tailX) / 2 + perpX * 0.3} ${(attachY + tailY) / 2 + perpY * 0.3} ${tailX} ${tailY}`,
    `L ${attachX - perpX} ${attachY - perpY}`,
    'Z',
  ].join(' ');
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
