/**
 * Signed-in Encore client routes (hash only). Guest share stays `#/share/<driveFileId>` in {@link App}.
 *
 * Optional in-fragment query: `#/song/<id>?scroll=<elementId>` — see {@link getEncoreHashScrollTargetId}.
 */
export type EncoreAppRoute =
  | { kind: 'library' }
  | { kind: 'savedSearches' }
  | { kind: 'practice'; songId?: string }
  | { kind: 'performances'; tab?: 'list' | 'wrapped' }
  | { kind: 'repertoireSettings' }
  /** Help center; import guide lives at `#/help` (legacy `#/settings/repertoire/import-guide` redirects here). */
  | { kind: 'help' }
  | { kind: 'song'; id: string; scrollToElementId?: string }
  | { kind: 'songNew' }
  | { kind: 'originals' }
  | { kind: 'original'; id: string }
  | { kind: 'originalNew' };

const ENCORE_HASH_SCROLL_QUERY = 'scroll';
/** Safe DOM id fragment for `getElementById` after `scroll` query param. */
const ENCORE_HASH_SCROLL_ID_RE = /^[a-zA-Z0-9_-]+$/;

function splitEncoreHashPathAndQuery(rawNoLeadingHash: string): { pathPart: string; query: string | undefined } {
  const q = rawNoLeadingHash.indexOf('?');
  if (q < 0) return { pathPart: rawNoLeadingHash, query: undefined };
  return {
    pathPart: rawNoLeadingHash.slice(0, q),
    query: rawNoLeadingHash.slice(q + 1),
  };
}

/**
 * Returns `#` + path-only fragment (drops in-fragment `?scroll=…` and any other query) for routing parse.
 */
export function encoreHashPathOnlyFragment(hash: string): string {
  const raw = hash.replace(/^#/, '').trim();
  const { pathPart } = splitEncoreHashPathAndQuery(raw);
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return `#${path}`;
}

/**
 * Sanitized `scroll` query value inside the location hash, or `undefined`.
 * Guest share `#/share/<id>?scroll=…` returns `undefined` (scroll is ignored for share URLs).
 */
export function getEncoreHashScrollTargetId(hash: string): string | undefined {
  const raw = hash.replace(/^#/, '').trim();
  const { pathPart, query } = splitEncoreHashPathAndQuery(raw);
  if (!query) return undefined;
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'share') return undefined;

  const params = new URLSearchParams(query);
  const id = params.get(ENCORE_HASH_SCROLL_QUERY)?.trim();
  if (!id || !ENCORE_HASH_SCROLL_ID_RE.test(id)) return undefined;
  return id;
}

/** In-app hash URL fragment for an Encore route (starts with `#`). Use on `<a href>` so modifier-clicks open a new tab. */
export function encoreAppHref(route: EncoreAppRoute): string {
  let h = '#/library';
  if (route.kind === 'savedSearches') h = '#/saved-searches';
  else if (route.kind === 'practice')
    h = route.songId ? `#/practice/${encodeURIComponent(route.songId)}` : '#/practice';
  else if (route.kind === 'performances')
    h = route.tab === 'wrapped' ? '#/performances/wrapped' : '#/performances';
  else if (route.kind === 'repertoireSettings') h = '#/settings/repertoire';
  else if (route.kind === 'help') h = '#/help';
  else if (route.kind === 'songNew') h = '#/song/new';
  else if (route.kind === 'originals') h = '#/originals';
  else if (route.kind === 'originalNew') h = '#/originals/new';
  else if (route.kind === 'original') h = `#/originals/${encodeURIComponent(route.id)}`;
  else if (route.kind === 'song') {
    const base = `#/song/${encodeURIComponent(route.id)}`;
    const scroll = route.scrollToElementId?.trim();
    h =
      scroll && ENCORE_HASH_SCROLL_ID_RE.test(scroll)
        ? `${base}?${ENCORE_HASH_SCROLL_QUERY}=${encodeURIComponent(scroll)}`
        : base;
  }
  return h;
}

/** True when the user expects a new tab/window (modifier keys or non-primary button on `click`). */
export function isModifiedOrNonPrimaryClick(
  e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'>,
): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Open an Encore hash route in a new browsing context (middle-click / programmatic). */
export function openEncoreRouteInBackgroundTab(route: EncoreAppRoute): void {
  const url = new URL(window.location.href);
  url.hash = encoreAppHref(route);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

export function parseEncoreAppHash(hash: string): EncoreAppRoute {
  const pathOnly = encoreHashPathOnlyFragment(hash);
  const raw = pathOnly.replace(/^#/, '').trim();
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'originals' && segs[1] === 'new') return { kind: 'originalNew' };
  if (segs[0] === 'originals' && segs[1]) return { kind: 'original', id: decodeURIComponent(segs[1]) };
  if (segs[0] === 'originals') return { kind: 'originals' };
  if (segs[0] === 'song' && segs[1] === 'new') return { kind: 'songNew' };
  if (segs[0] === 'song' && segs[1]) return { kind: 'song', id: decodeURIComponent(segs[1]) };
  if (segs[0] === 'stats') return { kind: 'library' };
  /** Signed-in “share settings” lived here; guest links use `#/share/<fileId>` (see App.tsx). */
  if (segs[0] === 'share' && !segs[1]) return { kind: 'library' };
  if (segs[0] === 'library') return { kind: 'library' };
  if (segs[0] === 'saved-searches') return { kind: 'savedSearches' };
  if (segs[0] === 'practice') {
    const songId = segs[1] ? decodeURIComponent(segs[1]) : undefined;
    return songId ? { kind: 'practice', songId } : { kind: 'practice' };
  }
  if (segs[0] === 'performances') {
    const sub = segs[1];
    const tab: 'list' | 'wrapped' = sub === 'wrapped' || sub === 'stats' ? 'wrapped' : 'list';
    return { kind: 'performances', tab };
  }
  if (segs[0] === 'help') return { kind: 'help' };
  if (segs[0] === 'settings' && segs[1] === 'repertoire' && segs[2] === 'import-guide') return { kind: 'help' };
  if (segs[0] === 'settings' && segs[1] === 'repertoire') return { kind: 'repertoireSettings' };
  return { kind: 'library' };
}

export function navigateEncore(route: EncoreAppRoute): void {
  const h = encoreAppHref(route);
  if (window.location.hash !== h) window.location.hash = h;
}
