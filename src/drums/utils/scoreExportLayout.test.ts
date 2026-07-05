import { describe, expect, it } from 'vitest';
import {
  calculateDrumsExportMeasureMinWidth,
  computeDrumsExportLineScale,
  computeDrumsExportUniformScale,
  computeDrumsScorePageSliceEnds,
  DRUMS_SCORE_EXPORT_CONTENT_PADDING,
  DRUMS_SCORE_EXPORT_LAYOUT,
  DRUMS_SCORE_EXPORT_LAYOUT_WIDTH,
  DRUMS_SCORE_PRINT_PAGE,
  getDrumsExportScaledLineHeight,
  packDrumsExportMeasureLines,
  packDrumsExportMeasuresByTargetLine,
} from './scoreExportLayout';

describe('scoreExportLayout', () => {
  it('targets US Letter printable width', () => {
    expect(DRUMS_SCORE_EXPORT_LAYOUT_WIDTH).toBe(
      DRUMS_SCORE_PRINT_PAGE.widthPt - 2 * DRUMS_SCORE_PRINT_PAGE.marginPt,
    );
  });

  it('sizes measures from sixteenth density, not note count', () => {
    const dense = calculateDrumsExportMeasureMinWidth(16, 16, false, false);
    const sparse = calculateDrumsExportMeasureMinWidth(16, 4, false, false);
    expect(dense).toBe(100 + 16 * 14);
    expect(sparse).toBe(dense);
  });

  it('uses compact simile width', () => {
    expect(calculateDrumsExportMeasureMinWidth(16, 4, false, true)).toBe(
      DRUMS_SCORE_EXPORT_LAYOUT.simileWidth,
    );
  });

  it('scales dense lines down proportionally instead of cramming', () => {
    const naturalWidth = calculateDrumsExportMeasureMinWidth(16, 16, false, false);
    const naturalWidths = [naturalWidth, naturalWidth, naturalWidth];
    const scale = computeDrumsExportLineScale([0, 1, 2], naturalWidths, 528);
    const usable = 528 - DRUMS_SCORE_EXPORT_LAYOUT.leftMargin - DRUMS_SCORE_EXPORT_LAYOUT.rightMargin;
    expect(scale).toBeCloseTo(usable / (naturalWidth * 3), 4);
    expect(scale).toBeLessThan(1);
  });

  it('uses the densest line scale for uniform export sizing', () => {
    const denseWidth = calculateDrumsExportMeasureMinWidth(16, 16, false, false);
    const sparseWidth = calculateDrumsExportMeasureMinWidth(8, 2, false, false);
    const naturalWidths = [sparseWidth, sparseWidth, sparseWidth, denseWidth, denseWidth, denseWidth];
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
    ];
    const uniformScale = computeDrumsExportUniformScale(lines, naturalWidths, 528);
    const denseScale = computeDrumsExportLineScale([3, 4, 5], naturalWidths, 528);
    const sparseScale = computeDrumsExportLineScale([0, 1, 2], naturalWidths, 528);
    expect(uniformScale).toBe(denseScale);
    expect(uniformScale).toBeLessThan(sparseScale);
  });

  it('shrinks row height with line scale', () => {
    expect(getDrumsExportScaledLineHeight(0.5)).toBe(DRUMS_SCORE_EXPORT_LAYOUT.lineHeight * 0.5);
  });

  it('packs measures into rows of three by default', () => {
    const indices = Array.from({ length: 14 }, (_, index) => index);
    const lines = packDrumsExportMeasuresByTargetLine(indices);
    expect(lines).toHaveLength(5);
    expect(lines.map((line) => line.length)).toEqual([3, 3, 3, 3, 2]);
  });

  it('packs sparse measures to fill each line before wrapping', () => {
    const minWidths = Array.from({ length: 8 }, () => 72);
    const lines = packDrumsExportMeasureLines(
      minWidths.map((_, index) => index),
      minWidths,
      528,
    );
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.flat()).toHaveLength(8);
  });

  it('paginates only on complete staff lines', () => {
    const headerHeight = 70;
    const pageContentHeight = DRUMS_SCORE_PRINT_PAGE.heightPt - 2 * DRUMS_SCORE_PRINT_PAGE.marginPt;
    const numLines = 10;
    const lineHeights = Array.from({ length: numLines }, () => DRUMS_SCORE_EXPORT_LAYOUT.lineHeight);
    const canvasLogicalHeight =
      DRUMS_SCORE_EXPORT_CONTENT_PADDING
      + headerHeight
      + DRUMS_SCORE_EXPORT_CONTENT_PADDING
      + DRUMS_SCORE_EXPORT_LAYOUT.topPadding
      + lineHeights.reduce((sum, height) => sum + height, 0)
      + DRUMS_SCORE_EXPORT_CONTENT_PADDING;

    const sliceEnds = computeDrumsScorePageSliceEnds({
      numLines,
      lineHeights,
      topPadding: DRUMS_SCORE_EXPORT_LAYOUT.topPadding,
      headerHeight,
      contentPadding: DRUMS_SCORE_EXPORT_CONTENT_PADDING,
      canvasLogicalHeight,
      pageContentHeight,
    });

    expect(sliceEnds.at(-1)).toBe(canvasLogicalHeight);
    expect(sliceEnds.length).toBeGreaterThan(1);

    const svgStartY = DRUMS_SCORE_EXPORT_CONTENT_PADDING + headerHeight + DRUMS_SCORE_EXPORT_CONTENT_PADDING;
    const firstLineTop = svgStartY + DRUMS_SCORE_EXPORT_LAYOUT.topPadding;
    const linePrefixHeights = lineHeights.reduce<number[]>((prefixes, height) => {
      prefixes.push((prefixes[prefixes.length - 1] ?? 0) + height);
      return prefixes;
    }, []);

    for (let sliceIndex = 0; sliceIndex < sliceEnds.length - 1; sliceIndex += 1) {
      const sliceEnd = sliceEnds[sliceIndex]!;
      const relative = sliceEnd - firstLineTop;
      const matchesLineBoundary = linePrefixHeights.some(
        (prefixHeight) => Math.abs(relative - (prefixHeight + DRUMS_SCORE_EXPORT_CONTENT_PADDING)) < 0.5,
      );
      expect(matchesLineBoundary).toBe(true);
    }
  });

  it('accepts legacy uniform lineHeight for pagination', () => {
    const sliceEnds = computeDrumsScorePageSliceEnds({
      numLines: 4,
      lineHeight: 76,
      topPadding: 12,
      headerHeight: 110,
      contentPadding: DRUMS_SCORE_EXPORT_CONTENT_PADDING,
      canvasLogicalHeight: 400,
      pageContentHeight: DRUMS_SCORE_PRINT_PAGE.heightPt - 2 * DRUMS_SCORE_PRINT_PAGE.marginPt,
    });

    expect(sliceEnds.at(-1)).toBe(400);
    expect(sliceEnds.every((value) => Number.isFinite(value))).toBe(true);
  });
});
