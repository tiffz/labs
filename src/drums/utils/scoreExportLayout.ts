import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import type { TimeSignature } from '../types';

/** US Letter page size in PDF points (72 dpi). */
export const DRUMS_SCORE_PRINT_PAGE = {
  widthPt: 612,
  heightPt: 792,
  marginPt: 36,
} as const;

/** Inner padding around score content in PNG/PDF exports (logical px). */
export const DRUMS_SCORE_EXPORT_CONTENT_PADDING = 20;

/** Printable content width — matches letter page minus half-inch margins. */
export const DRUMS_SCORE_EXPORT_LAYOUT_WIDTH =
  DRUMS_SCORE_PRINT_PAGE.widthPt - 2 * DRUMS_SCORE_PRINT_PAGE.marginPt;

export const DRUMS_SCORE_EXPORT_LAYOUT = {
  containerPadding: 12,
  /** Room for drum symbols drawn ~40px above the staff. */
  lineHeight: 76,
  topPadding: 12,
  leftMargin: 6,
  rightMargin: 6,
  simileWidth: 28,
  /** Room for barlines, time signature, and padding before note spacing begins. */
  baseWidth: 100,
  /** Primary width driver — generous enough that VexFlow can lay out 16ths before line scale. */
  widthPerSixteenth: 14,
  minWidth: 160,
  /** No upper cap — dense bars scale down as a whole line instead of cramming glyphs. */
  maxWidth: 9999,
  minLineWidth: 320,
  /** Default measures per export line — rows are filled to this count when possible. */
  targetMeasuresPerLine: 3,
  /** Extra space below the final staff row so export rasterization does not clip descenders. */
  bottomPadding: 20,
  /** Left inset for export measure numbers inside a bar. */
  measureNumberInset: 3,
  measureNumberFirstMeasureInset: 8,
  /** Baseline sits this many px above the top staff line (negative = higher). */
  measureNumberTopOffset: -1,
  /** In-score drum symbols — slightly smaller and closer to noteheads than editor defaults. */
  drumSymbolScale: 0.76,
  drumSymbolYOffset: -30,
} as const;

/** Canvas header typography and spacing for PNG/PDF exports. */
export const DRUMS_SCORE_EXPORT_HEADER = {
  height: 74,
  titleBaseline: 16,
  metaBaseline: 32,
  /** Extra breathing room between the meta line and symbol key. */
  legendBaseline: 56,
  legendSymbolScale: 0.55,
  legendItemWidth: 44,
  legendFontSizePx: 9,
  legendLabelOffsetY: 8,
} as const;

/** Staff line color — light enough to stay visibly grey after export line scaling. */
export const DRUMS_SCORE_EXPORT_STAFF_STROKE = '#e5e7eb';
export const DRUMS_SCORE_EXPORT_STAFF_STROKE_WIDTH = 1.75;

export const DRUMS_SCORE_EXPORT_SVG_META = {
  lines: 'data-drums-export-lines',
  /** Comma-separated effective row heights after proportional line scaling. */
  lineHeights: 'data-drums-export-line-heights',
  /** Legacy uniform row height — kept for older cached SVG metadata. */
  lineHeight: 'data-drums-export-line-height',
  topPadding: 'data-drums-export-top-padding',
} as const;

/** Pack visible measures into fixed-size rows (typically 3–4 measures). */
export function packDrumsExportMeasuresByTargetLine(
  visibleMeasureIndices: readonly number[],
  targetMeasuresPerLine = DRUMS_SCORE_EXPORT_LAYOUT.targetMeasuresPerLine,
): number[][] {
  if (visibleMeasureIndices.length === 0) return [];
  const lines: number[][] = [];
  for (let index = 0; index < visibleMeasureIndices.length; index += targetMeasuresPerLine) {
    lines.push(visibleMeasureIndices.slice(index, index + targetMeasuresPerLine));
  }
  return lines;
}

export interface DrumsScoreExportSvgMetadata {
  numLines: number;
  lineHeights: number[];
  topPadding: number;
}

function parseDrumsExportLineHeightsAttribute(
  raw: string | null,
  legacyUniformHeight: number | null,
  numLines: number,
): number[] {
  if (raw) {
    const parsed = raw
      .split(',')
      .map((value) => Number.parseFloat(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (parsed.length === numLines) {
      return parsed;
    }
  }

  return resolveDrumsExportLineHeights(
    numLines,
    undefined,
    legacyUniformHeight ?? undefined,
  );
}

export function readDrumsScoreExportSvgMetadata(svg: SVGSVGElement): DrumsScoreExportSvgMetadata {
  const numLines = Number.parseInt(svg.getAttribute(DRUMS_SCORE_EXPORT_SVG_META.lines) ?? '', 10);
  const topPadding = Number.parseFloat(svg.getAttribute(DRUMS_SCORE_EXPORT_SVG_META.topPadding) ?? '');
  const legacyLineHeight = Number.parseFloat(
    svg.getAttribute(DRUMS_SCORE_EXPORT_SVG_META.lineHeight) ?? '',
  );
  if (!Number.isFinite(numLines) || numLines <= 0) {
    throw new Error('Score export SVG is missing line layout metadata.');
  }
  return {
    numLines,
    lineHeights: parseDrumsExportLineHeightsAttribute(
      svg.getAttribute(DRUMS_SCORE_EXPORT_SVG_META.lineHeights),
      Number.isFinite(legacyLineHeight) ? legacyLineHeight : null,
      numLines,
    ),
    topPadding: Number.isFinite(topPadding) ? topPadding : DRUMS_SCORE_EXPORT_LAYOUT.topPadding,
  };
}

/** Scale a full staff line to fit the printable row width without cramming note spacing. */
export function computeDrumsExportLineScale(
  measureIndices: readonly number[],
  naturalWidths: readonly number[],
  lineBudget: number,
  leftMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.leftMargin,
  rightMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.rightMargin,
): number {
  const usableWidth = getDrumsExportUsableLineWidth(lineBudget, leftMargin, rightMargin);
  const naturalLineWidth = measureIndices.reduce(
    (sum, measureIndex) => sum + (naturalWidths[measureIndex] ?? DRUMS_SCORE_EXPORT_LAYOUT.minWidth),
    0,
  );
  if (naturalLineWidth <= 0) {
    return 1;
  }
  return Math.min(1, usableWidth / naturalLineWidth);
}

/** One scale for every export row so sparse and dense lines render at the same visual size. */
export function computeDrumsExportUniformScale(
  lines: readonly (readonly number[])[],
  naturalWidths: readonly number[],
  lineBudget: number,
  leftMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.leftMargin,
  rightMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.rightMargin,
): number {
  if (lines.length === 0) {
    return 1;
  }

  const lineScales = lines.map((measureIndices) =>
    computeDrumsExportLineScale(measureIndices, naturalWidths, lineBudget, leftMargin, rightMargin),
  );
  return Math.min(...lineScales);
}

export function getDrumsExportScaledLineHeight(
  lineScale: number,
  baseLineHeight: number = DRUMS_SCORE_EXPORT_LAYOUT.lineHeight,
): number {
  return baseLineHeight * lineScale;
}

/** Wrap one rendered export line in a uniform scale transform anchored at the row origin. */
export function wrapDrumsExportLineSvgElements(
  svg: SVGSVGElement,
  startChildIndex: number,
  yPosition: number,
  leftMargin: number,
  lineScale: number,
): void {
  if (!Number.isFinite(lineScale) || lineScale >= 1 || startChildIndex >= svg.childNodes.length) {
    return;
  }

  const nodes = Array.from(svg.childNodes)
    .slice(startChildIndex)
    .filter((node) => node.nodeName !== 'defs');
  if (nodes.length === 0) {
    return;
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'drums-export-line');
  group.setAttribute(
    'transform',
    `translate(${leftMargin}, ${yPosition}) scale(${lineScale}) translate(${-leftMargin}, ${-yPosition})`,
  );

  const insertBefore = svg.childNodes[startChildIndex] ?? null;
  svg.insertBefore(group, insertBefore);
  nodes.forEach((node) => {
    group.appendChild(node);
  });
}

function getDrumsExportLineBottomY(
  firstLineTop: number,
  lineHeights: readonly number[],
  lineIndex: number,
  trailingPadding: number,
): number {
  let y = firstLineTop;
  for (let line = 0; line <= lineIndex; line += 1) {
    y += lineHeights[line] ?? DRUMS_SCORE_EXPORT_LAYOUT.lineHeight;
  }
  return y + trailingPadding;
}

function resolveDrumsExportLineHeights(
  numLines: number,
  lineHeights: readonly number[] | undefined,
  uniformLineHeight: number | undefined,
): number[] {
  if (lineHeights && lineHeights.length === numLines) {
    return [...lineHeights];
  }

  const fallbackHeight = uniformLineHeight ?? DRUMS_SCORE_EXPORT_LAYOUT.lineHeight;
  return Array.from({ length: numLines }, () => fallbackHeight);
}

/** Page slice end positions (canvas logical Y) that never cut through a staff line. */
export function computeDrumsScorePageSliceEnds(options: {
  numLines: number;
  lineHeights?: readonly number[];
  /** Uniform row height fallback for older export metadata/callers. */
  lineHeight?: number;
  topPadding: number;
  headerHeight: number;
  contentPadding: number;
  canvasLogicalHeight: number;
  pageContentHeight: number;
}): number[] {
  const {
    numLines,
    topPadding,
    headerHeight,
    contentPadding,
    canvasLogicalHeight,
    pageContentHeight,
  } = options;
  const resolvedLineHeights = resolveDrumsExportLineHeights(
    numLines,
    options.lineHeights,
    options.lineHeight,
  );

  const svgStartY = contentPadding + headerHeight + contentPadding;
  const firstLineTop = svgStartY + topPadding;
  const sliceEnds: number[] = [];
  let nextLine = 0;
  let pageTop = 0;

  while (pageTop < canvasLogicalHeight - 0.5 && nextLine < numLines) {
    const pageBottom = pageTop + pageContentHeight;
    let lastLineOnPage = nextLine;

    for (let line = nextLine; line < numLines; line += 1) {
      const lineBottom = getDrumsExportLineBottomY(
        firstLineTop,
        resolvedLineHeights,
        line,
        contentPadding * 0.5,
      );
      if (lineBottom <= pageBottom + 0.5) {
        lastLineOnPage = line;
      } else {
        break;
      }
    }

    if (lastLineOnPage < nextLine) {
      lastLineOnPage = nextLine;
    }

    const isFinalSlice = lastLineOnPage >= numLines - 1;
    const sliceEnd = isFinalSlice
      ? canvasLogicalHeight
      : getDrumsExportLineBottomY(firstLineTop, resolvedLineHeights, lastLineOnPage, contentPadding);

    sliceEnds.push(Math.min(canvasLogicalHeight, sliceEnd));
    nextLine = lastLineOnPage + 1;
    pageTop = sliceEnds[sliceEnds.length - 1]!;
  }

  if (sliceEnds.length === 0 || sliceEnds[sliceEnds.length - 1]! < canvasLogicalHeight) {
    sliceEnds.push(canvasLogicalHeight);
  }

  return sliceEnds.filter((value) => Number.isFinite(value) && value > 0);
}

export function getDrumsExportUsableLineWidth(
  lineBudget: number,
  leftMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.leftMargin,
  rightMargin: number = DRUMS_SCORE_EXPORT_LAYOUT.rightMargin,
): number {
  return lineBudget - leftMargin - rightMargin;
}

/** Greedy pack: fit as many measures as possible on each export line. */
export function packDrumsExportMeasureLines(
  visibleMeasureIndices: readonly number[],
  minWidths: readonly number[],
  lineBudget: number,
  leftMargin = DRUMS_SCORE_EXPORT_LAYOUT.leftMargin,
  rightMargin = DRUMS_SCORE_EXPORT_LAYOUT.rightMargin,
): number[][] {
  const usableWidth = getDrumsExportUsableLineWidth(lineBudget, leftMargin, rightMargin);
  const lines: number[][] = [];
  let currentLine: number[] = [];
  let currentLineWidth = 0;

  for (const measureIndex of visibleMeasureIndices) {
    const minWidth = minWidths[measureIndex] ?? DRUMS_SCORE_EXPORT_LAYOUT.minWidth;
    if (currentLine.length > 0 && currentLineWidth + minWidth > usableWidth) {
      lines.push(currentLine);
      currentLine = [measureIndex];
      currentLineWidth = minWidth;
      continue;
    }
    currentLine.push(measureIndex);
    currentLineWidth += minWidth;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

export function getMeasureSixteenths(
  notes: ReadonlyArray<{ durationInSixteenths: number }>,
  timeSignature: TimeSignature,
): number {
  const total = notes.reduce((sum, note) => sum + note.durationInSixteenths, 0);
  return total > 0 ? total : getSixteenthsPerMeasure(timeSignature);
}

/** Natural measure width from rhythmic density — same width for every bar in a time signature row. */
export function calculateDrumsExportMeasureMinWidth(
  sixteenthsInMeasure: number,
  _noteCount: number,
  _isLongMeasure: boolean,
  isSimile: boolean,
): number {
  if (isSimile) {
    return DRUMS_SCORE_EXPORT_LAYOUT.simileWidth;
  }

  const { baseWidth, widthPerSixteenth, minWidth, maxWidth } = DRUMS_SCORE_EXPORT_LAYOUT;
  const byDuration = baseWidth + sixteenthsInMeasure * widthPerSixteenth;
  return Math.max(minWidth, Math.min(maxWidth, byDuration));
}
