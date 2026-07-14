import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildBookletPageZipEntries } from './bookletPagesZip';
import type { BookletPageInfo, SpreadInfo, ParsedFile } from '../types';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

function page(pageNumber: number, name: string): BookletPageInfo {
  return {
    parsedFile: parsed(pageNumber, name),
    imageData: TINY_PNG,
    width: 1,
    height: 1,
  };
}

describe('buildBookletPageZipEntries', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        expect(url.startsWith('data:')).toBe(true);
        const comma = url.indexOf(',');
        const b64 = url.slice(comma + 1);
        const binary = atob(b64);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports reading-order page images with Mixam-style names', async () => {
    const entries = await buildBookletPageZipEntries(
      [page(0, 'front.png'), page(1, 'page1.png'), page(-2, 'back.png')],
      [],
    );
    expect(entries.map((e) => e.fileName)).toEqual(['front.png', 'page1.png', 'back.png']);
    expect(entries.every((e) => e.blob.size > 0)).toBe(true);
  });

  it('includes linked spreads as a single image and skips blanks', async () => {
    const spread: SpreadInfo = {
      parsedFile: {
        ...parsed(2, 'page2-page3.png', { isSpread: true, spreadPages: [2, 3] }),
        isSpread: true,
        spreadPages: [2, 3],
      },
      imageData: TINY_PNG,
      width: 2,
      height: 1,
      pages: [2, 3],
    };
    const entries = await buildBookletPageZipEntries(
      [page(0, 'front.png'), page(1, 'page1.png')],
      [spread],
    );
    const names = entries.map((e) => e.fileName);
    expect(names).toEqual(['front.png', 'page1.png', 'page2-page3.png']);
  });
});
