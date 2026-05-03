import { useEffect, useState, type RefObject } from 'react';

export type EncoreInViewportOptions = {
  /** Same shape as `IntersectionObserverInit` — passed straight through. */
  rootMargin?: string;
  threshold?: number | number[];
  /**
   * Once a target has been observed in the viewport, stay `true` forever (no flapping while the
   * user scrolls back and forth). Defaults to `true` because Encore mostly uses this for
   * "lazy-load until visible" semantics; flip to `false` for animation-style triggers.
   */
  stickyOnce?: boolean;
};

/**
 * Returns `true` once the referenced element has intersected the viewport (or the optional
 * scroll root). Designed for lazy-loading expensive cell content — Drive thumbnails, hover
 * cards, large images — without paying the cost for offscreen rows.
 *
 * Uses `IntersectionObserver` (always available in supported Encore browsers); on the very
 * first server-rendered frame and as a safety net for SSR, we eagerly mark elements visible.
 */
export function useEncoreInViewport(
  ref: RefObject<Element | null>,
  options?: EncoreInViewportOptions,
): boolean {
  const stickyOnce = options?.stickyOnce ?? true;
  const rootMargin = options?.rootMargin ?? '120px';
  const threshold = options?.threshold ?? 0;
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (stickyOnce) {
              observer.disconnect();
              return;
            }
          } else if (!stickyOnce) {
            setVisible(false);
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, stickyOnce]);

  return visible;
}
