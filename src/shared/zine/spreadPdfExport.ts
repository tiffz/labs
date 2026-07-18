/**
 * Facing-spread PDF builders for book-style downloads (Lyrefly book preview / Zine-aligned).
 *
 * - **digital**: facing spreads for screen reading; omit blank-only pads when both sides empty
 * - **print**: keep booklet pads (white blanks) so printer spreads match Mixam-style facing pages
 */
import { blankPageDataUrl, combineToSpreadImage, loadImageFromDataUrl } from './imageCanvas';
import { createDistributionPdf, type DistributionPdfPage } from './pdfExport';

export type FacingSpreadPdfFormat = 'digital' | 'print';

export type FacingSpreadPdfInputPage = {
  id: string;
  label: string;
  /** Empty string or missing ⇒ blank pad. */
  imageUrl?: string;
  isBlank?: boolean;
  isSpread?: boolean;
};

export type FacingSpreadPdfView = {
  id: string;
  left: FacingSpreadPdfInputPage;
  right?: FacingSpreadPdfInputPage;
  isSpread: boolean;
};

async function resolvePageDataUrl(
  page: FacingSpreadPdfInputPage | undefined,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<string | null> {
  if (!page || page.isBlank || !page.imageUrl) {
    return blankPageDataUrl(fallbackWidth, fallbackHeight);
  }
  return page.imageUrl;
}

async function inferPageSize(views: readonly FacingSpreadPdfView[]): Promise<{
  width: number;
  height: number;
}> {
  for (const view of views) {
    for (const side of [view.left, view.right]) {
      if (!side || side.isBlank || !side.imageUrl) continue;
      if (side.isSpread || view.isSpread) {
        const img = await loadImageFromDataUrl(side.imageUrl);
        return { width: Math.max(1, Math.floor(img.width / 2)), height: img.height };
      }
      const img = await loadImageFromDataUrl(side.imageUrl);
      return { width: img.width, height: img.height };
    }
  }
  return { width: 800, height: 1200 };
}

/**
 * Composite booklet spread views into PDF pages (one facing spread per PDF page).
 */
export async function createFacingSpreadPdf(
  views: readonly FacingSpreadPdfView[],
  format: FacingSpreadPdfFormat,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const { width: pageW, height: pageH } = await inferPageSize(views);
  const pdfPages: DistributionPdfPage[] = [];

  for (const view of views) {
    const leftBlank = !view.left.imageUrl || Boolean(view.left.isBlank);
    const rightBlank = !view.right || !view.right.imageUrl || Boolean(view.right.isBlank);

    if (format === 'digital' && leftBlank && rightBlank) continue;

    if (view.isSpread && view.left.imageUrl && !view.left.isBlank) {
      pdfPages.push({
        label: view.left.label,
        dataUrl: view.left.imageUrl,
      });
      continue;
    }

    const leftUrl = await resolvePageDataUrl(view.left, pageW, pageH);
    const rightUrl = await resolvePageDataUrl(view.right, pageW, pageH);
    if (!leftUrl || !rightUrl) continue;

    // Digital: single-sided views (only one page of art) stay single-width for reading.
    if (format === 'digital' && leftBlank && !rightBlank) {
      pdfPages.push({ label: view.right!.label, dataUrl: rightUrl });
      continue;
    }
    if (format === 'digital' && !leftBlank && rightBlank) {
      pdfPages.push({ label: view.left.label, dataUrl: leftUrl });
      continue;
    }

    const spreadUrl = await combineToSpreadImage(leftUrl, rightUrl);
    const label =
      view.right && !rightBlank
        ? `${view.left.label} / ${view.right.label}`
        : view.left.label;
    pdfPages.push({ label, dataUrl: spreadUrl });
  }

  if (pdfPages.length === 0) {
    throw new Error('No pages to export');
  }

  return createDistributionPdf(pdfPages, onProgress);
}
