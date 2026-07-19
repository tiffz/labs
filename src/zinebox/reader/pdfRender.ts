import { driveGetMediaArrayBuffer } from '../../shared/drive/driveFetch';
import { zineboxDb } from '../db/zineboxDb';
import type { ZineboxReaderMode } from '../types';
import { normalizeZineboxReadComicId } from '../routes/zineboxHash';

export const SAMPLE_COMIC_PDF_URL = '/zinebox/fixtures/sample-comic.pdf';

export type ComicPdfUnavailableReason = 'missing-comic' | 'missing-blob';

export class ComicPdfUnavailableError extends Error {
  readonly comicId: string;
  readonly reason: ComicPdfUnavailableReason;

  constructor(comicId: string, reason: ComicPdfUnavailableReason) {
    super(reason === 'missing-comic' ? 'Comic not found.' : 'PDF not available on this device.');
    this.name = 'ComicPdfUnavailableError';
    this.comicId = comicId;
    this.reason = reason;
  }
}

export type ResolveComicPdfSourceOptions = {
  accessToken?: string | null;
};

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

export async function resolveComicPdfSource(
  comicId: string,
  options?: ResolveComicPdfSourceOptions,
): Promise<string | Uint8Array> {
  const id = normalizeZineboxReadComicId(comicId);
  const comic = await zineboxDb.comics.get(id);
  if (!comic) {
    throw new ComicPdfUnavailableError(id, 'missing-comic');
  }

  if (comic.storageKind === 'sample') {
    return SAMPLE_COMIC_PDF_URL;
  }

  const row = await zineboxDb.comicFiles.get(id);
  if (row?.blob && row.blob.size > 0) {
    return new Uint8Array(await row.blob.arrayBuffer());
  }

  const backupFileId = comic.driveBackupFileId?.trim();
  const accessToken = options?.accessToken?.trim();
  if (backupFileId && accessToken) {
    const bytes = await driveGetMediaArrayBuffer(accessToken, backupFileId);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    await zineboxDb.comicFiles.put({ comicId: id, blob });
    if (comic.storageKind !== 'local') {
      await zineboxDb.comics.update(id, { storageKind: 'local' });
    }
    return new Uint8Array(bytes);
  }

  throw new ComicPdfUnavailableError(id, 'missing-blob');
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

/** Exported for unit tests and layout helpers. */
export function computePageFitScale(
  fit: PageRenderFit,
  pageWidth: number,
  pageHeight: number,
  containerWidth: number,
  containerHeight: number,
): number {
  if (pageWidth <= 0 || pageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return 1;
  }
  return fitScale(fit, pageWidth, pageHeight, containerWidth, containerHeight);
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

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return { displayWidth, displayHeight };
}

export type PdfPageDimensions = {
  width: number;
  height: number;
};

export async function loadPdfPageDimensions(
  doc: import('pdfjs-dist').PDFDocumentProxy,
): Promise<PdfPageDimensions[]> {
  return Promise.all(
    Array.from({ length: doc.numPages }, async (_, index) => {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale: 1 });
      return { width: viewport.width, height: viewport.height };
    }),
  );
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * PDF pages whose width is ~2× a typical single page — exported as one wide canvas
 * instead of pairing with a neighbor in spread mode.
 */
export function detectWideSpreadPageNumbers(dimensions: readonly PdfPageDimensions[]): Set<number> {
  if (dimensions.length === 0) return new Set();

  const aspects = dimensions.map((d) => d.width / d.height);
  const portraitWidths = dimensions
    .filter((_, index) => aspects[index]! < 1.05)
    .map((d) => d.width);
  const portraitAspects = aspects.filter((a) => a < 1.05);

  const refWidth = portraitWidths.length > 0 ? median(portraitWidths) : median(dimensions.map((d) => d.width));
  const refAspect = portraitAspects.length > 0 ? median(portraitAspects) : median(aspects);

  const aspectThreshold = Math.max(1.12, refAspect * 1.5);
  const widthThreshold = refWidth * 1.45;

  const wide = new Set<number>();
  dimensions.forEach((d, index) => {
    const aspect = d.width / d.height;
    if (aspect >= aspectThreshold || d.width >= widthThreshold) {
      wide.add(index + 1);
    }
  });
  return wide;
}

/** Pair adjacent PDF pages for two-up spread mode (ignores wide built-in spreads). */
export function spreadPagePairNumbers(
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

export function spreadPageNumbers(
  currentPage: number,
  totalPages: number,
  spreadOffset: 0 | 1,
  wideSpreadPages?: ReadonlySet<number>,
): number[] {
  if (wideSpreadPages?.has(currentPage)) return [currentPage];

  const base = spreadPagePairNumbers(currentPage, totalPages, spreadOffset);
  if (base.length === 2) {
    const [left, right] = base;
    if (wideSpreadPages?.has(right!)) {
      return currentPage === left ? [left!] : [right!];
    }
    if (wideSpreadPages?.has(left!)) return [left!];
  }
  return base;
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
  wideSpreadPages?: ReadonlySet<number>,
): string {
  if (totalPages <= 0) return '';
  if (mode === 'scroll') return `${totalPages} pages`;
  if (mode === 'spread') {
    const pages = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
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
  wideSpreadPages?: ReadonlySet<number>,
): number {
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
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
  wideSpreadPages?: ReadonlySet<number>,
): { canPrev: boolean; canNext: boolean } {
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
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
  wideSpreadPages?: ReadonlySet<number>,
): number {
  if (mode !== 'spread') return currentPage;
  const visible = spreadPageNumbers(currentPage, totalPages, spreadOffset, wideSpreadPages);
  return visible[visible.length - 1] ?? currentPage;
}
