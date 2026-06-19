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

export function parseZineboxHash(hash: string): ZineboxRoute {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return { kind: 'library' };
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'read' && segs[1]) {
    return { kind: 'read', comicId: decodeURIComponent(segs[1]) };
  }
  return { kind: 'library' };
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
