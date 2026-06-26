/**
 * Helpers for in-app links that must behave like normal browser links:
 * modifier+click and middle-click open a new tab/window, href is copyable,
 * and a plain primary click uses SPA navigation without a full reload.
 */

export function isModifiedOrNonPrimaryClick(
  e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'>,
): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Resolve a hash, query, or path href against the current page for `window.open`. */
export function resolveAppLinkUrl(href: string): string {
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) return href;
  const base = window.location.href;
  if (href.startsWith('#')) {
    const url = new URL(base);
    url.hash = href;
    return url.toString();
  }
  return new URL(href, base).toString();
}

export function openAppLinkInBackgroundTab(href: string): void {
  window.open(resolveAppLinkUrl(href), '_blank', 'noopener,noreferrer');
}

/** Attach to `<a href>` onClick: modifier/middle clicks use the browser; plain click prevents reload. */
export function handleSpaLinkClick(
  e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button' | 'preventDefault'>,
  onNavigate: () => void,
): void {
  if (isModifiedOrNonPrimaryClick(e)) return;
  e.preventDefault();
  onNavigate();
}

/** Table/card row activation: open href in a new tab on modifier, else run onNavigate. */
export function handleSpaRowActivate(
  e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'>,
  href: string,
  onNavigate: () => void,
): void {
  if (isModifiedOrNonPrimaryClick(e)) {
    openAppLinkInBackgroundTab(href);
    return;
  }
  onNavigate();
}
