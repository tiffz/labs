/**
 * Signed-in Encore client routes (hash only). Guest share stays `#/share/<driveFileId>` in {@link App}.
 */
export type EncoreAppRoute =
  | { kind: 'library' }
  | { kind: 'performances' }
  | { kind: 'repertoireSettings' }
  | { kind: 'song'; id: string }
  | { kind: 'songNew' };

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
  if (segs[0] === 'performances') return { kind: 'performances' };
  if (segs[0] === 'settings' && segs[1] === 'repertoire') return { kind: 'repertoireSettings' };
  return { kind: 'library' };
}

export function navigateEncore(route: EncoreAppRoute): void {
  let h = '#/library';
  if (route.kind === 'performances') h = '#/performances';
  else if (route.kind === 'repertoireSettings') h = '#/settings/repertoire';
  else if (route.kind === 'songNew') h = '#/song/new';
  else if (route.kind === 'song') h = `#/song/${encodeURIComponent(route.id)}`;
  if (window.location.hash !== h) window.location.hash = h;
}
