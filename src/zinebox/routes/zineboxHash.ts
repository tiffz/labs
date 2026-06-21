import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import type { ZineboxLibraryReadFilter } from '../utils/zineboxReadFilter';

export type ZineboxRoute =
  | { kind: 'library' }
  | { kind: 'read'; comicId: string };

export type ZineboxLibraryParams = {
  filter: ZineboxLibraryReadFilter;
  source: string | null;
  tag: string | null;
  q: string | null;
};

export type ZineboxReaderParams = {
  mode: ZineboxReaderMode;
  spreadOffset: ZineboxSpreadOffset;
};

/** Strip an accidental `?mode=…` suffix embedded in a copied read URL path segment. */
export function normalizeZineboxReadComicId(raw: string): string {
  const decoded = decodeURIComponent(raw.trim());
  const queryIndex = decoded.indexOf('?');
  return queryIndex >= 0 ? decoded.slice(0, queryIndex) : decoded;
}

/** Hash query string — supports normal `#/read/id?mode=spread` and malformed `%3Fmode%3Dspread` in the id. */
export function extractZineboxHashSearch(hash: string): string {
  const withoutHash = hash.replace(/^#/, '');
  const literalQueryIndex = withoutHash.indexOf('?');
  if (literalQueryIndex >= 0) {
    return withoutHash.slice(literalQueryIndex);
  }
  const path = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'read' && segs[1]) {
    const decoded = decodeURIComponent(segs[1]);
    const embedded = decoded.indexOf('?');
    if (embedded >= 0) return decoded.slice(embedded);
  }
  return '';
}

export function parseZineboxHash(hash: string): ZineboxRoute {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return { kind: 'library' };
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'read' && segs[1]) {
    return { kind: 'read', comicId: normalizeZineboxReadComicId(segs[1]) };
  }
  return { kind: 'library' };
}

/** Rewrite double-encoded read links to canonical `#/read/<id>?mode=…` form. */
export function canonicalizeZineboxReadHash(hash: string, readerParams: ZineboxReaderParams): string | null {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return null;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] !== 'read' || !segs[1]) return null;

  const comicId = normalizeZineboxReadComicId(segs[1]);
  const embeddedSearch = extractZineboxHashSearch(hash);
  const mergedParams =
    embeddedSearch.length > 0
      ? { ...readerParams, ...parseReaderParams(embeddedSearch) }
      : readerParams;
  const canonical = zineboxReadHref(comicId, mergedParams);
  return canonical === hash ? null : canonical;
}

export function parseLibraryParams(search: string): ZineboxLibraryParams {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const filterRaw = params.get('filter');
  const filter: ZineboxLibraryParams['filter'] =
    filterRaw === 'unread' ? 'unread' : filterRaw === 'read' ? 'read' : 'all';
  const source = params.get('source');
  const tag = params.get('tag');
  const qRaw = params.get('q');
  return {
    filter,
    source: source && source.length > 0 ? source : null,
    tag: tag && tag.length > 0 ? tag : null,
    q: qRaw && qRaw.trim().length > 0 ? qRaw.trim() : null,
  };
}

export function parseReaderParams(search: string): ZineboxReaderParams {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const modeRaw = params.get('mode');
  const mode: ZineboxReaderMode =
    modeRaw === 'spread' || modeRaw === 'scroll' ? modeRaw : 'single';
  const spreadOffset: ZineboxSpreadOffset = params.get('spreadOffset') === '1' ? 1 : 0;
  return { mode, spreadOffset };
}

export function zineboxLibraryHref(params: ZineboxLibraryParams): string {
  const qs = new URLSearchParams();
  if (params.filter !== 'all') qs.set('filter', params.filter);
  if (params.source) qs.set('source', params.source);
  if (params.tag) qs.set('tag', params.tag);
  if (params.q) qs.set('q', params.q);
  const query = qs.toString();
  return query ? `#/library?${query}` : '#/library';
}

export function zineboxReadHref(
  comicId: string,
  params: ZineboxReaderParams,
): string {
  const qs = new URLSearchParams();
  if (params.mode !== 'single') qs.set('mode', params.mode);
  if (params.spreadOffset === 1) qs.set('spreadOffset', '1');
  const query = qs.toString();
  const base = `#/read/${encodeURIComponent(comicId)}`;
  return query ? `${base}?${query}` : base;
}

export function navigateZineboxHash(href: string): void {
  if (window.location.hash !== href) {
    window.location.hash = href;
  }
}
