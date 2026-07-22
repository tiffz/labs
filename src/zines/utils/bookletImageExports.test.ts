import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectVerticalScrollSegments,
  composeVerticalScrollBlob,
  buildBookletSpreadZipEntries,
} from './bookletImageExports';
import { buildBookPages } from './spreadPairing';
import type { BookletPageInfo, SpreadInfo, ParsedFile } from '../types';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const WIDE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD5PA/tAAAAEklEQVR42mP8z8BQz0AEYBxVSF+FAP5IAv4xq7FbAAAAAElFTkSuQmCC';

function parsed(pageNumber: number | null, name: string, extras: Partial<ParsedFile> = {}): ParsedFile {
  return {
    file: new File([], name),
    pageNumber,
    isSpread: false,
    displayName: name,
    originalName: name,
    ...extras,
  };
}

function page(pageNumber: number, name: string, dataUrl = TINY_PNG): BookletPageInfo {
  return {
    parsedFile: parsed(pageNumber, name),
    imageData: dataUrl,
    width: 1,
    height: 1,
  };
}

function makeSpread(): SpreadInfo {
  return {
    parsedFile: {
      ...parsed(2, 'page2-page3.png', { isSpread: true, spreadPages: [2, 3] }),
      isSpread: true,
      spreadPages: [2, 3],
    },
    imageData: WIDE_PNG,
    width: 2,
    height: 1,
    pages: [2, 3],
  };
}

describe('bookletImageExports', () => {
  beforeEach(() => {
    class MockImage {
      width = 2;
      height = 1;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage);

    HTMLCanvasElement.prototype.toBlob = function toBlob(
      callback: BlobCallback,
      type?: string,
    ) {
      queueMicrotask(() =>
        callback(new Blob([new Uint8Array([1, 2, 3])], { type: type || 'image/png' })),
      );
    };
    HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
      return TINY_PNG;
    };
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const mockedGetContext = function getContext(
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ): RenderingContext | null {
      const ctx = originalGetContext.call(this, type as never, ...(args as [])) as unknown as
        | RenderingContext
        | null;
      if (ctx) return ctx;
      return {
        fillStyle: '',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillRect() {},
        drawImage() {},
      } as unknown as CanvasRenderingContext2D;
    };
    HTMLCanvasElement.prototype.getContext = mockedGetContext as unknown as HTMLCanvasElement['getContext'];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (!url.startsWith('data:')) {
          return new Response(new Uint8Array([1, 2, 3]), {
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        }
        const comma = url.indexOf(',');
        const b64 = url.slice(comma + 1);
        const binary = atob(b64);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const mime = url.slice(5, url.indexOf(';')) || 'image/png';
        return new Response(bytes, { headers: { 'Content-Type': mime } });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes linked spreads in reading pages used for vertical scroll', () => {
    const book = buildBookPages([page(0, 'front.png'), page(1, 'page1.png')], [makeSpread()]);
    const content = book.filter((p) => !p.isBlank && p.imageData);
    expect(content.map((p) => ({ label: p.label, isSpread: p.isSpread }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ isSpread: true })]),
    );
  });

  it('splits linked spreads into two vertical-scroll segments', async () => {
    const segments = await collectVerticalScrollSegments(
      [page(0, 'front.png'), page(1, 'page1.png')],
      [makeSpread()],
    );
    expect(segments.length).toBe(4);
  });

  it('composes a vertical scroll JPEG blob', async () => {
    const blob = await composeVerticalScrollBlob([TINY_PNG, TINY_PNG]);
    expect(blob.type).toMatch(/jpeg|jpg/);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('builds numbered facing-page spreads for zip export', async () => {
    const entries = await buildBookletSpreadZipEntries(
      [page(0, 'front.png'), page(1, 'page1.png'), page(-2, 'back.png')],
      [],
    );
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0]!.fileName).toMatch(/^01-/);
    expect(entries.every((e) => e.blob.size > 0)).toBe(true);
  });
});
