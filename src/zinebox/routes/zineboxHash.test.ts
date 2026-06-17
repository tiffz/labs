import { describe, expect, it } from 'vitest';

import {
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

  it('parses library params', () => {
    expect(parseLibraryParams('?filter=unread&source=Shortbox')).toEqual({
      filter: 'unread',
      source: 'Shortbox',
      tag: null,
    });
    expect(parseLibraryParams('?tag=anthology')).toEqual({
      filter: 'all',
      source: null,
      tag: 'anthology',
    });
    expect(parseLibraryParams('?view=shelves&filter=unread')).toEqual({
      filter: 'unread',
      source: null,
      tag: null,
    });
  });

  it('serializes library href', () => {
    expect(zineboxLibraryHref({ filter: 'unread', source: 'Itch.io', tag: null })).toBe(
      '#/library?filter=unread&source=Itch.io',
    );
    expect(zineboxLibraryHref({ filter: 'all', source: null, tag: '2024' })).toBe(
      '#/library?tag=2024',
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
