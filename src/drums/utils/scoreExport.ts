import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ParsedRhythm, TimeSignature } from '../types';
import {
  buildVexFlowSvgFontStyles,
  ensureVexFlowFontsLoaded,
  injectSvgStyle,
  VEXFLOW_NOTATION_FONTS,
} from '../../shared/vexflow/vexFlowFontExport';
import { drawDrumsSymbolLegendOnCanvas } from '../../shared/notation/drumSymbols';
import { createPdfBlobFromCanvas } from '../../shared/utils/labsPdfFromCanvas';
import { svgElementToCanvas, svgElementToPngBlob } from '../../shared/utils/svgToCanvas';
import { applyDrumsExportSvgInlinePresentation, injectDrumsScoreExportStyles } from './drumsScoreExportStyles';
import {
  computeDrumsScorePageSliceEnds,
  DRUMS_SCORE_EXPORT_CONTENT_PADDING,
  DRUMS_SCORE_EXPORT_HEADER,
  DRUMS_SCORE_EXPORT_LAYOUT_WIDTH,
  DRUMS_SCORE_PRINT_PAGE,
  readDrumsScoreExportSvgMetadata,
} from './scoreExportLayout';

export {
  DRUMS_SCORE_EXPORT_CONTENT_PADDING,
  DRUMS_SCORE_EXPORT_HEADER,
  DRUMS_SCORE_EXPORT_LAYOUT_WIDTH,
  DRUMS_SCORE_PRINT_PAGE,
} from './scoreExportLayout';

export const DRUMS_SCORE_EXPORT_HEADER_HEIGHT = DRUMS_SCORE_EXPORT_HEADER.height;
export const DRUMS_SCORE_EXPORT_SCALE = 2;

export interface DrumsScoreExportOptions {
  rhythm: ParsedRhythm;
  timeSignature: TimeSignature;
  notation: string;
  title: string;
  bpm: number;
  format: 'png' | 'pdf';
}

function drawScoreHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  headerHeight: number,
  contentPadding: number,
  options: Pick<DrumsScoreExportOptions, 'title' | 'bpm' | 'timeSignature'>,
): void {
  void width;
  void headerHeight;

  const textX = contentPadding + 4;
  const titleY = contentPadding + DRUMS_SCORE_EXPORT_HEADER.titleBaseline;
  const metaY = contentPadding + DRUMS_SCORE_EXPORT_HEADER.metaBaseline;
  const legendY = contentPadding + DRUMS_SCORE_EXPORT_HEADER.legendBaseline;

  ctx.fillStyle = '#111827';
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(options.title, textX, titleY);

  ctx.fillStyle = '#4b5563';
  ctx.font = '13px system-ui, -apple-system, Segoe UI, sans-serif';
  const meta = `${options.timeSignature.numerator}/${options.timeSignature.denominator} · ${options.bpm} BPM`;
  ctx.fillText(meta, textX, metaY);

  drawDrumsSymbolLegendOnCanvas(ctx, textX, legendY, {
    symbolScale: DRUMS_SCORE_EXPORT_HEADER.legendSymbolScale,
    itemWidth: DRUMS_SCORE_EXPORT_HEADER.legendItemWidth,
    fontSizePx: DRUMS_SCORE_EXPORT_HEADER.legendFontSizePx,
    labelOffsetY: DRUMS_SCORE_EXPORT_HEADER.legendLabelOffsetY,
  });
}

/** Embed export CSS so cloned SVG blobs match on-screen Darbuka staff styling. */
export function applyDrumsExportSvgStyles(svg: SVGSVGElement): void {
  injectDrumsScoreExportStyles(svg);
}

async function waitForScoreSvg(container: HTMLElement, timeoutMs = 5000): Promise<SVGSVGElement> {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const svg = container.querySelector('svg');
    if (svg && svg.querySelector('g')) {
      return svg;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  throw new Error('Timed out waiting for score notation to render.');
}

export async function renderDrumsScoreSvg(options: {
  rhythm: ParsedRhythm;
  timeSignature: TimeSignature;
  notation: string;
  layoutWidth?: number;
}): Promise<SVGSVGElement> {
  const layoutWidth = options.layoutWidth ?? DRUMS_SCORE_EXPORT_LAYOUT_WIDTH;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${layoutWidth}px`;
  container.style.visibility = 'hidden';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    await ensureVexFlowFontsLoaded(VEXFLOW_NOTATION_FONTS);
    const { default: VexFlowRenderer } = await import('../components/VexFlowRenderer');
    flushSync(() => {
      root.render(
        React.createElement(VexFlowRenderer, {
          rhythm: options.rhythm,
          timeSignature: options.timeSignature,
          notation: options.notation,
          exportMode: true,
          exportLayoutWidth: layoutWidth,
        }),
      );
    });
    const svg = await waitForScoreSvg(container);
    const clone = svg.cloneNode(true) as SVGSVGElement;
    applyDrumsExportSvgStyles(clone);
    applyDrumsExportSvgInlinePresentation(clone);
    return clone;
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export async function exportDrumsScoreSheet(options: DrumsScoreExportOptions): Promise<Blob> {
  if (!options.rhythm.isValid || options.rhythm.measures.length === 0) {
    throw new Error('Enter a valid rhythm before exporting a score sheet.');
  }

  const svg = await renderDrumsScoreSvg(options);
  const drawHeader = (ctx: CanvasRenderingContext2D, width: number, headerHeight: number) => {
    drawScoreHeader(ctx, width, headerHeight, DRUMS_SCORE_EXPORT_CONTENT_PADDING, options);
  };
  const rasterOptions = {
    scale: DRUMS_SCORE_EXPORT_SCALE,
    headerHeight: DRUMS_SCORE_EXPORT_HEADER_HEIGHT,
    contentPadding: DRUMS_SCORE_EXPORT_CONTENT_PADDING,
    drawHeader,
    prepareClone: async (clone: SVGSVGElement) => {
      const css = await buildVexFlowSvgFontStyles(VEXFLOW_NOTATION_FONTS);
      injectSvgStyle(clone, css);
    },
  };

  if (options.format === 'png') {
    return svgElementToPngBlob(svg, rasterOptions);
  }

  const canvas = await svgElementToCanvas(svg, rasterOptions);
  const logicalWidth = canvas.width / DRUMS_SCORE_EXPORT_SCALE;
  const logicalHeight = canvas.height / DRUMS_SCORE_EXPORT_SCALE;
  const exportMetadata = readDrumsScoreExportSvgMetadata(svg);
  const pageContentHeight =
    DRUMS_SCORE_PRINT_PAGE.heightPt - 2 * DRUMS_SCORE_PRINT_PAGE.marginPt;
  const pageSliceEndsLogical = computeDrumsScorePageSliceEnds({
    numLines: exportMetadata.numLines,
    lineHeights: exportMetadata.lineHeights,
    lineHeight: exportMetadata.lineHeights[0],
    topPadding: exportMetadata.topPadding,
    headerHeight: DRUMS_SCORE_EXPORT_HEADER_HEIGHT,
    contentPadding: DRUMS_SCORE_EXPORT_CONTENT_PADDING,
    canvasLogicalHeight: logicalHeight,
    pageContentHeight,
  });

  return createPdfBlobFromCanvas(canvas, {
    width: logicalWidth,
    height: logicalHeight,
    pageWidth: DRUMS_SCORE_PRINT_PAGE.widthPt,
    pageHeight: DRUMS_SCORE_PRINT_PAGE.heightPt,
    margin: DRUMS_SCORE_PRINT_PAGE.marginPt,
    fitWidthPaginate: true,
    pageSliceEndsLogical,
  });
}
