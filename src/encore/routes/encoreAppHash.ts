/**
 * Signed-in Encore client routes (hash only). Guest share stays `#/share/<driveFileId>` in {@link App}.
 */
export type EncoreAppRoute =
  | { kind: 'library' }
  | { kind: 'practice' }
  | { kind: 'performances'; tab?: 'list' | 'wrapped' }
  | { kind: 'repertoireSettings' }
  /** Help center; import guide lives at `#/help` (legacy `#/settings/repertoire/import-guide` redirects here). */
  | { kind: 'help' }
  | { kind: 'song'; id: string }
  | { kind: 'songNew' };

/** In-app hash URL fragment for an Encore route (starts with `#`). Use on `<a href>` so modifier-clicks open a new tab. */
export function encoreAppHref(route: EncoreAppRoute): string {
  let h = '#/library';
  if (route.kind === 'practice') h = '#/practice';
  else if (route.kind === 'performances')
    h = route.tab === 'wrapped' ? '#/performances/wrapped' : '#/performances';
  else if (route.kind === 'repertoireSettings') h = '#/settings/repertoire';
  else if (route.kind === 'help') h = '#/help';
  else if (route.kind === 'songNew') h = '#/song/new';
  else if (route.kind === 'song') h = `#/song/${encodeURIComponent(route.id)}`;
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
  const raw = hash.replace(/^#/, '').trim();
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'song' && segs[1] === 'new') return { kind: 'songNew' };
  if (segs[0] === 'song' && segs[1]) return { kind: 'song', id: decodeURIComponent(segs[1]) };
  if (segs[0] === 'stats') return { kind: 'library' };
  /** Signed-in “share settings” lived here; guest links use `#/share/<fileId>` (see App.tsx). */
  if (segs[0] === 'share' && !segs[1]) return { kind: 'library' };
  if (segs[0] === 'library') return { kind: 'library' };
  if (segs[0] === 'practice') return { kind: 'practice' };
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
