export interface PdfFromCanvasOptions {
  /** Rendered image width in PDF points. */
  width?: number;
  /** Rendered image height in PDF points. */
  height?: number;
  /** Fixed page width in PDF points (defaults to image width). */
  pageWidth?: number;
  /** Fixed page height in PDF points (defaults to image height). */
  pageHeight?: number;
  /** Page margin in PDF points when `fitToPage` is true. */
  margin?: number;
  /** Scale image down to fit inside page margins without upscaling. */
  fitToPage?: boolean;
  /** Fill page width and add pages for vertical overflow (avoids shrinking width on tall scores). */
  fitWidthPaginate?: boolean;
  /** Canvas logical Y positions where each page ends — must not cut through notation rows. */
  pageSliceEndsLogical?: readonly number[];
}

/** Lazy pdf-lib wrapper so score/PDF export does not pull pdf-lib into app main chunks. */
export async function createPdfBlobFromCanvas(
  canvas: HTMLCanvasElement,
  options: PdfFromCanvasOptions = {},
): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const dataURL = canvas.toDataURL('image/png');
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(dataURL);

  const imageWidth = options.width ?? canvas.width;
  const imageHeight = options.height ?? canvas.height;
  const pageWidth = options.pageWidth ?? imageWidth;
  const pageHeight = options.pageHeight ?? imageHeight;
  const margin = options.margin ?? 0;

  if (options.fitWidthPaginate) {
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(1, maxWidth / imageWidth);
    const drawWidth = imageWidth * scale;
    const deviceScaleY = canvas.height / imageHeight;
    const sliceEnds = options.pageSliceEndsLogical?.length
      ? [...options.pageSliceEndsLogical]
      : (() => {
          const scaledHeight = imageHeight * scale;
          const sliceHeightLogical = maxHeight / scale;
          const pageCount = Math.max(1, Math.ceil(scaledHeight / maxHeight));
          const defaultEnds: number[] = [];
          for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
            defaultEnds.push(Math.min(imageHeight, (pageIndex + 1) * sliceHeightLogical));
          }
          return defaultEnds;
        })();

    let sliceStart = 0;
    for (const sliceEnd of sliceEnds) {
      if (!Number.isFinite(sliceEnd) || sliceEnd <= sliceStart) continue;

      const sliceHeightLogical = sliceEnd - sliceStart;
      const srcYDevice = sliceStart * deviceScaleY;
      const sliceHeightDevice = sliceHeightLogical * deviceScaleY;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(sliceHeightDevice);
      const sliceCtx = sliceCanvas.getContext('2d');
      if (!sliceCtx) {
        throw new Error('Canvas 2D context unavailable for paginated PDF export.');
      }
      sliceCtx.drawImage(
        canvas,
        0,
        srcYDevice,
        canvas.width,
        sliceHeightDevice,
        0,
        0,
        canvas.width,
        sliceHeightDevice,
      );

      const sliceDataUrl = sliceCanvas.toDataURL('image/png');
      const sliceImage = await pdfDoc.embedPng(sliceDataUrl);
      const drawHeight = sliceHeightLogical * scale;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(sliceImage, {
        x: margin,
        y: pageHeight - margin - drawHeight,
        width: drawWidth,
        height: drawHeight,
      });

      sliceStart = sliceEnd;
      if (sliceStart >= imageHeight - 0.5) break;
    }

    if (sliceStart < imageHeight - 0.5) {
      const sliceHeightLogical = imageHeight - sliceStart;
      const srcYDevice = sliceStart * deviceScaleY;
      const sliceHeightDevice = sliceHeightLogical * deviceScaleY;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(sliceHeightDevice);
      const sliceCtx = sliceCanvas.getContext('2d');
      if (!sliceCtx) {
        throw new Error('Canvas 2D context unavailable for paginated PDF export.');
      }
      sliceCtx.drawImage(
        canvas,
        0,
        srcYDevice,
        canvas.width,
        sliceHeightDevice,
        0,
        0,
        canvas.width,
        sliceHeightDevice,
      );
      const sliceDataUrl = sliceCanvas.toDataURL('image/png');
      const sliceImage = await pdfDoc.embedPng(sliceDataUrl);
      const drawHeight = sliceHeightLogical * scale;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(sliceImage, {
        x: margin,
        y: pageHeight - margin - drawHeight,
        width: drawWidth,
        height: drawHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }

  let drawWidth = imageWidth;
  let drawHeight = imageHeight;
  let drawX = 0;
  let drawY = 0;

  if (options.fitToPage) {
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(1, maxWidth / imageWidth, maxHeight / imageHeight);
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
    drawX = margin + (maxWidth - drawWidth) / 2;
    drawY = pageHeight - margin - drawHeight;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(pngImage, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
