import { handleSpaLinkClick } from '../../shared/navigation/spaLinkClick';

export { handleSpaLinkClick };

/**
 * Gesture home shell routes (hash only). Session/debrief stay out of the URL.
 */
export type GestureAppRoute = { kind: 'practice' } | { kind: 'collections' };

export type GestureHomeTab = GestureAppRoute['kind'];

export function parseGestureAppHash(hash: string): GestureAppRoute {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return { kind: 'practice' };
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'collections') return { kind: 'collections' };
  if (segs[0] === 'practice') return { kind: 'practice' };
  return { kind: 'practice' };
}

export function gestureAppHref(route: GestureAppRoute): string {
  return route.kind === 'collections' ? '#/collections' : '#/practice';
}

export function navigateGesture(route: GestureAppRoute): void {
  const h = gestureAppHref(route);
  if (window.location.hash !== h) window.location.hash = h;
}

export function gestureRouteToTab(route: GestureAppRoute): GestureHomeTab {
  return route.kind;
}
