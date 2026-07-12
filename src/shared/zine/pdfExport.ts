export type DistributionPdfPage = {
  label: string;
  /** PNG or JPEG data URL. */
  dataUrl: string;
};

type PdfLibModule = typeof import('pdf-lib');

let pdfLibPromise: Promise<PdfLibModule> | null = null;

async function loadPdfLib(): Promise<PdfLibModule> {
  pdfLibPromise ??= import('pdf-lib');
  return pdfLibPromise;
}

async function embedDataUrl(
  pdfDoc: Awaited<ReturnType<PdfLibModule['PDFDocument']['create']>>,
  dataUrl: string,
): Promise<{ image: Awaited<ReturnType<typeof pdfDoc.embedPng>>; width: number; height: number }> {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    const image = await pdfDoc.embedJpg(dataUrl);
    return { image, width: image.width, height: image.height };
  }
  const image = await pdfDoc.embedPng(dataUrl);
  return { image, width: image.width, height: image.height };
}

/** Sequential single-page PDF for digital reading (distribution format). */
export async function createDistributionPdf(
  pages: readonly DistributionPdfPage[],
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const { PDFDocument } = await loadPdfLib();
  const pdfDoc = await PDFDocument.create();
  const total = pages.length;

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]!;
    if (index > 0) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });
    }
    if (onProgress && total > 0) {
      onProgress((index + 1) / total);
    }
    const { image, width, height } = await embedDataUrl(pdfDoc, page.dataUrl);
    const pdfPage = pdfDoc.addPage([width, height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width, height });
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

/** Convert a Blob to a data URL (for PDF embedding). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}
