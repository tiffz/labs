import type { ZineboxReaderMode } from '../types';
import { zineboxDb } from '../db/zineboxDb';

export const SAMPLE_COMIC_PDF_URL = '/zinebox/fixtures/sample-comic.pdf';

let pdfjsModule: typeof import('pdfjs-dist') | null = null;

export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) return pdfjsModule;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjsModule = pdfjs;
  return pdfjs;
}

export async function resolveComicPdfSource(comicId: string): Promise<string | Uint8Array> {
  const comic = await zineboxDb.comics.get(comicId);
  if (comic?.storageKind === 'local') {
    const row = await zineboxDb.comicFiles.get(comicId);
    if (row?.blob) return new Uint8Array(await row.blob.arrayBuffer());
  }
  return SAMPLE_COMIC_PDF_URL;
}

export async function loadPdfDocument(source: string | Uint8Array): Promise<import('pdfjs-dist').PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument(source).promise;
  return doc;
}

export async function renderPdfPageToCanvas(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: { fit: 'width' | 'height'; containerWidth: number; containerHeight: number },
): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const viewportAt1 = page.getViewport({ scale: 1 });
  const scale =
    options.fit === 'width'
      ? options.containerWidth / viewportAt1.width
      : options.containerHeight / viewportAt1.height;
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');
  if (!context) return;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
}

export function spreadPageNumbers(
  currentPage: number,
  totalPages: number,
  spreadOffset: 0 | 1,
): number[] {
  if (totalPages <= 0) return [];
  if (spreadOffset === 1 && currentPage === 1) return [1];
  if (currentPage % 2 === spreadOffset) {
    const left = currentPage;
    const right = left + 1 <= totalPages ? left + 1 : null;
    return right ? [left, right] : [left];
  }
  const right = currentPage;
  const left = right - 1 >= 1 ? right - 1 : null;
  return left ? [left, right] : [right];
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

export function pageFromProgress(progressPercentage: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  const ratio = Math.min(100, Math.max(0, progressPercentage)) / 100;
  return clampPage(Math.max(1, Math.round(ratio * totalPages)), totalPages);
}

export function progressFromPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.round((page / totalPages) * 100);
}

export function readerModeLabel(mode: ZineboxReaderMode): string {
  switch (mode) {
    case 'single':
      return 'Single page';
    case 'spread':
      return 'Two-page spread';
    case 'scroll':
      return 'Vertical scroll';
    default:
      return mode;
  }
}
