import { buildVexFlowSvgFontStyles, injectSvgStyle } from '../notation/vexFlowFontExport';

export interface SvgToCanvasOptions {
  /** Device pixel ratio multiplier for sharper PNG/PDF output. */
  scale?: number;
  /** Extra pixels above the SVG for title/metadata. */
  headerHeight?: number;
  /** White space inset around header + score content. */
  contentPadding?: number;
  /** Called after the canvas background is filled and before the SVG is drawn. */
  drawHeader?: (ctx: CanvasRenderingContext2D, width: number, headerHeight: number) => void;
  /** Inline VexFlow SMuFL fonts so standalone SVG blob rasterization keeps glyphs. */
  vexFlowFonts?: readonly string[];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load SVG image for export.'));
    image.src = url;
  });
}

export async function svgElementToCanvas(
  svg: SVGSVGElement,
  options: SvgToCanvasOptions = {},
): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? 2;
  const headerHeight = options.headerHeight ?? 0;
  const contentPadding = options.contentPadding ?? 0;
  const viewBox = svg.viewBox?.baseVal;
  const widthAttr = Number.parseFloat(svg.getAttribute('width') ?? '');
  const heightAttr = Number.parseFloat(svg.getAttribute('height') ?? '');
  const svgWidth = viewBox && viewBox.width > 0
    ? viewBox.width
    : widthAttr || svg.width?.baseVal?.value || svg.clientWidth || 0;
  const svgHeight = viewBox && viewBox.height > 0
    ? viewBox.height
    : heightAttr || svg.height?.baseVal?.value || svg.clientHeight || 0;

  if (svgWidth <= 0 || svgHeight <= 0) {
    throw new Error('Score SVG has no drawable dimensions.');
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('width')) {
    clone.setAttribute('width', String(svgWidth));
  }
  if (!clone.getAttribute('height')) {
    clone.setAttribute('height', String(svgHeight));
  }

  if (options.vexFlowFonts && options.vexFlowFonts.length > 0) {
    const css = await buildVexFlowSvgFontStyles(options.vexFlowFonts);
    injectSvgStyle(clone, css);
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    const totalWidth = svgWidth + contentPadding * 2;
    const totalHeight = contentPadding + headerHeight + contentPadding + svgHeight + contentPadding;
    canvas.width = Math.ceil(totalWidth * scale);
    canvas.height = Math.ceil(totalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable for score export.');
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.save();
    ctx.translate(0, contentPadding);
    options.drawHeader?.(ctx, totalWidth, headerHeight);
    ctx.restore();
    ctx.drawImage(
      image,
      contentPadding,
      contentPadding + headerHeight + contentPadding,
      svgWidth,
      svgHeight,
    );
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgElementToPngBlob(
  svg: SVGSVGElement,
  options?: SvgToCanvasOptions,
): Promise<Blob> {
  const canvas = await svgElementToCanvas(svg, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode score PNG.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
