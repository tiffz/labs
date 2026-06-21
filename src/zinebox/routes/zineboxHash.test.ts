import { describe, expect, it } from 'vitest';

import {
  canonicalizeZineboxReadHash,
  extractZineboxHashSearch,
  normalizeZineboxReadComicId,
  parseLibraryParams,
  parseReaderParams,
  parseZineboxHash,
  zineboxLibraryHref,
  zineboxReadHref,
} from '../routes/zineboxHash';

describe('zineboxHash', () => {
  it('parses library route', () => {
    expect(parseZineboxHash('#/library')).toEqual({ kind: 'library' });
    expect(parseZineboxHash('')).toEqual({ kind: 'library' });
  });

  it('parses read route', () => {
    expect(parseZineboxHash('#/read/comic-1')).toEqual({ kind: 'read', comicId: 'comic-1' });
  });

  it('strips embedded reader query accidentally copied into the comic id segment', () => {
    const malformed =
      '#/read/comic-9e4ac876-9b3b-41c6-b78d-8a5c8e00acbe%3Fmode%3Dspread';
    expect(parseZineboxHash(malformed)).toEqual({
      kind: 'read',
      comicId: 'comic-9e4ac876-9b3b-41c6-b78d-8a5c8e00acbe',
    });
    expect(extractZineboxHashSearch(malformed)).toBe('?mode=spread');
    expect(parseReaderParams(extractZineboxHashSearch(malformed))).toEqual({
      mode: 'spread',
      spreadOffset: 0,
    });
    expect(
      canonicalizeZineboxReadHash(malformed, { mode: 'single', spreadOffset: 0 }),
    ).toBe('#/read/comic-9e4ac876-9b3b-41c6-b78d-8a5c8e00acbe?mode=spread');
  });

  it('normalizeZineboxReadComicId leaves plain ids unchanged', () => {
    expect(normalizeZineboxReadComicId('comic-1')).toBe('comic-1');
  });

  it('parses library params', () => {
    expect(parseLibraryParams('?filter=unread&source=Shortbox')).toEqual({
      filter: 'unread',
      source: 'Shortbox',
      tag: null,
      q: null,
    });
    expect(parseLibraryParams('?tag=anthology')).toEqual({
      filter: 'all',
      source: null,
      tag: 'anthology',
      q: null,
    });
    expect(parseLibraryParams('?view=shelves&filter=unread')).toEqual({
      filter: 'unread',
      source: null,
      tag: null,
      q: null,
    });
    expect(parseLibraryParams('?filter=read')).toEqual({
      filter: 'read',
      source: null,
      tag: null,
      q: null,
    });
    expect(parseLibraryParams('?q=alive')).toEqual({
      filter: 'all',
      source: null,
      tag: null,
      q: 'alive',
    });
  });

  it('serializes library href', () => {
    expect(zineboxLibraryHref({ filter: 'unread', source: 'Itch.io', tag: null, q: null })).toBe(
      '#/library?filter=unread&source=Itch.io',
    );
    expect(zineboxLibraryHref({ filter: 'read', source: null, tag: null, q: null })).toBe(
      '#/library?filter=read',
    );
    expect(zineboxLibraryHref({ filter: 'all', source: null, tag: '2024', q: null })).toBe(
      '#/library?tag=2024',
    );
    expect(zineboxLibraryHref({ filter: 'all', source: null, tag: null, q: 'moon pool' })).toBe(
      '#/library?q=moon+pool',
    );
  });

  it('parses reader params', () => {
    expect(parseReaderParams('?mode=spread&spreadOffset=1')).toEqual({
      mode: 'spread',
      spreadOffset: 1,
    });
  });

  it('serializes read href', () => {
    expect(zineboxReadHref('comic-2', { mode: 'scroll', spreadOffset: 0 })).toBe(
      '#/read/comic-2?mode=scroll',
    );
  });
});
