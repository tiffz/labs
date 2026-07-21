import { useEffect, useState } from 'react';

/**
 * Viewport media queries that are correct on the **first** render.
 *
 * The tempting shape — `useState(false)` plus a `useEffect` that measures — is
 * a layout-shift generator: the first paint commits the desktop branch, then
 * the effect corrects it and everything below jumps. Piano shipped exactly
 * that and paid 0.43 CLS on mobile (the sidebar painted at 367px tall, then
 * collapsed to 0). Reading the query during the initial state computation
 * costs nothing and removes the shift entirely.
 *
 * SSR-safe: with no `window`, falls back to the desktop branch.
 *
 * Matches on the **layout** viewport (`matchMedia`), deliberately not the
 * visual viewport. Pinch-zoom and the on-screen keyboard shrink the visual
 * viewport without changing the layout width, and switching a whole app to its
 * mobile layout mid-zoom or when a field is focused would be jarring — the
 * breakpoint should track the page's real width, which is what `matchMedia`
 * reports. (Piano's pre-shared effect OR'd in a `visualViewport.width` check;
 * that parity is intentionally dropped.)
 */

function queryMatchesNow(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/** Live `matchMedia` result, correct from the first render onward. */
export function useViewportMatch(query: string): boolean {
  const [matches, setMatches] = useState(() => queryMatchesNow(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(query);
    const apply = () => setMatches(mediaQuery.matches);

    // Re-read on mount: the query can change between the initial render and
    // this effect (rotation, a resize during hydration).
    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, [query]);

  return matches;
}

/**
 * True while the viewport is at or below `maxWidthPx`.
 *
 * Defaults to the `md` breakpoint in `labs-breakpoints.css`. Pass the value
 * matching the CSS this drives — a hook and a media query disagreeing about
 * the breakpoint is its own class of bug.
 */
export function useIsNarrowViewport(maxWidthPx = 900): boolean {
  return useViewportMatch(`(max-width: ${maxWidthPx}px)`);
}
