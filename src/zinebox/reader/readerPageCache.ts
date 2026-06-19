import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import {
  readerPixelRatio,
  renderPdfPageToCanvas,
  spreadPageNumbers,
  type PageRenderOptions,
} from './pdfRender';

export type PageRenderFit = PageRenderOptions['fit'];

export type CachedPageRender = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
};

type CacheKey = string;

function cacheKey(pageNumber: number, options: PageRenderOptions): CacheKey {
  const ratio = options.pixelRatio ?? readerPixelRatio();
  return `${pageNumber}:${options.fit}:${Math.round(options.containerWidth)}x${Math.round(options.containerHeight)}@${ratio}`;
}

export class ReaderPageCache {
  private readonly cache = new Map<CacheKey, CachedPageRender>();
  private readonly order: CacheKey[] = [];

  constructor(private readonly maxEntries = 12) {}

  has(pageNumber: number, options: PageRenderOptions): boolean {
    return this.cache.has(cacheKey(pageNumber, options));
  }

  get(pageNumber: number, options: PageRenderOptions): CachedPageRender | undefined {
    const key = cacheKey(pageNumber, options);
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    this.touch(key);
    return hit;
  }

  set(pageNumber: number, options: PageRenderOptions, render: CachedPageRender): void {
    const key = cacheKey(pageNumber, options);
    const existing = this.cache.get(key);
    if (existing && existing.bitmap !== render.bitmap) {
      existing.bitmap.close();
    }
    this.cache.set(key, render);
    this.touch(key);
    while (this.order.length > this.maxEntries) {
      const evictKey = this.order.shift();
      if (!evictKey) break;
      const evict = this.cache.get(evictKey);
      evict?.bitmap.close();
      this.cache.delete(evictKey);
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      entry.bitmap.close();
    }
    this.cache.clear();
    this.order.length = 0;
  }

  private touch(key: CacheKey): void {
    const index = this.order.indexOf(key);
    if (index >= 0) this.order.splice(index, 1);
    this.order.push(key);
  }
}

export function createReaderPageCache(maxEntries = 12): ReaderPageCache {
  return new ReaderPageCache(maxEntries);
}

function applyCanvasDisplaySize(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
): void {
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

export async function renderPageToBitmap(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNumber: number,
  options: PageRenderOptions,
): Promise<CachedPageRender> {
  const offscreen = document.createElement('canvas');
  const layout = await renderPdfPageToCanvas(doc, pageNumber, offscreen, options);
  const bitmap = await createImageBitmap(offscreen);
  return {
    bitmap,
    width: offscreen.width,
    height: offscreen.height,
    displayWidth: layout.displayWidth,
    displayHeight: layout.displayHeight,
  };
}

export function blitCachedPageToCanvas(cached: CachedPageRender, canvas: HTMLCanvasElement): void {
  canvas.width = cached.width;
  canvas.height = cached.height;
  applyCanvasDisplaySize(canvas, cached.displayWidth, cached.displayHeight);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(cached.bitmap, 0, 0);
}

export async function displayReaderPage(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: PageRenderOptions,
  cache: ReaderPageCache,
): Promise<void> {
  const cached = cache.get(pageNumber, options);
  if (cached) {
    blitCachedPageToCanvas(cached, canvas);
    return;
  }

  const layout = await renderPdfPageToCanvas(doc, pageNumber, canvas, options);
  const bitmap = await createImageBitmap(canvas);
  cache.set(pageNumber, options, {
    bitmap,
    width: canvas.width,
    height: canvas.height,
    displayWidth: layout.displayWidth,
    displayHeight: layout.displayHeight,
  });
}

export function getReaderPrefetchPages(
  mode: ZineboxReaderMode,
  currentPage: number,
  totalPages: number,
  spreadOffset: ZineboxSpreadOffset,
): number[] {
  const pages = new Set<number>();
  const add = (page: number) => {
    if (page >= 1 && page <= totalPages) pages.add(page);
  };

  if (mode === 'single') {
    add(currentPage - 1);
    add(currentPage + 1);
    add(currentPage + 2);
    return [...pages];
  }

  if (mode === 'spread') {
    for (const delta of [-2, -1, 1, 2]) {
      for (const page of spreadPageNumbers(currentPage + delta, totalPages, spreadOffset)) {
        add(page);
      }
    }
    return [...pages];
  }

  return [];
}

export function scheduleReaderPagePrefetch(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNumbers: readonly number[],
  options: PageRenderOptions,
  cache: ReaderPageCache,
): void {
  const pending = pageNumbers.filter((page) => !cache.has(page, options));
  if (pending.length === 0) return;

  const run = () => {
    void (async () => {
      for (const pageNumber of pending) {
        if (cache.has(pageNumber, options)) continue;
        try {
          const render = await renderPageToBitmap(doc, pageNumber, options);
          cache.set(pageNumber, options, render);
        } catch {
          // Prefetch is best-effort.
        }
      }
    })();
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 0);
  }
}

export function buildPageRenderOptions(
  fit: PageRenderFit,
  containerWidth: number,
  containerHeight: number,
): PageRenderOptions {
  return {
    fit,
    containerWidth,
    containerHeight,
    pixelRatio: readerPixelRatio(),
  };
}
