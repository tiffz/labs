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

export type PageRenderFit = 'width' | 'height' | 'contain';

export type PageRenderOptions = {
  fit: PageRenderFit;
  containerWidth: number;
  containerHeight: number;
  pixelRatio?: number;
};

export type PageRenderLayout = {
  displayWidth: number;
  displayHeight: number;
};

/** Cap DPR for memory; 2× is crisp on most displays. */
export function readerPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

function fitScale(
  fit: PageRenderFit,
  pageWidth: number,
  pageHeight: number,
  containerWidth: number,
  containerHeight: number,
): number {
  const scaleW = containerWidth / pageWidth;
  const scaleH = containerHeight / pageHeight;
  switch (fit) {
    case 'width':
      return scaleW;
    case 'height':
      return scaleH;
    case 'contain':
    default:
      return Math.min(scaleW, scaleH);
  }
}

export async function renderPdfPageToCanvas(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: PageRenderOptions,
): Promise<PageRenderLayout> {
  const pixelRatio = options.pixelRatio ?? readerPixelRatio();
  const page = await doc.getPage(pageNumber);
  const viewportAt1 = page.getViewport({ scale: 1 });
  const displayScale = fitScale(
    options.fit,
    viewportAt1.width,
    viewportAt1.height,
    options.containerWidth,
    options.containerHeight,
  );
  const renderScale = displayScale * pixelRatio;
  const viewport = page.getViewport({ scale: renderScale });
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      displayWidth: viewportAt1.width * displayScale,
      displayHeight: viewportAt1.height * displayScale,
    };
  }

  const displayWidth = viewportAt1.width * displayScale;
  const displayHeight = viewportAt1.height * displayScale;

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  await page.render({ canvasContext: context, viewport }).promise;
  return { displayWidth, displayHeight };
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

export function formatReaderPageCount(
  mode: ZineboxReaderMode,
  currentPage: number,
  totalPages: number,
  spreadOffset: 0 | 1,
): string {
  if (totalPages <= 0) return '';
  if (mode === 'scroll') return `${totalPages} pages`;
  if (mode === 'spread') {
    const pages = spreadPageNumbers(currentPage, totalPages, spreadOffset);
    if (pages.length === 1) return `${pages[0]} / ${totalPages}`;
    return `${pages[0]}–${pages[pages.length - 1]} / ${totalPages}`;
  }
  return `${currentPage} / ${totalPages}`;
}

export function advanceSpreadPage(
  currentPage: number,
  direction: -1 | 1,
  totalPages: number,
  spreadOffset: 0 | 1,
): number {
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset);
  if (direction > 0) {
    const last = visible[visible.length - 1] ?? currentPage;
    return clampPage(last + 1, totalPages);
  }
  const first = visible[0] ?? currentPage;
  return clampPage(first - 1, totalPages);
}

export function spreadNavigationState(
  currentPage: number,
  totalPages: number,
  spreadOffset: 0 | 1,
): { canPrev: boolean; canNext: boolean } {
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset);
  return {
    canPrev: (visible[0] ?? 1) > 1,
    canNext: (visible[visible.length - 1] ?? totalPages) < totalPages,
  };
}

export function readerProgressPage(
  mode: ZineboxReaderMode,
  currentPage: number,
  totalPages: number,
  spreadOffset: 0 | 1,
): number {
  if (mode !== 'spread') return currentPage;
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset);
  return visible[visible.length - 1] ?? currentPage;
}
