/** Pure horizontal overflow math — keep in sync with e2e/helpers/horizontalScrollHeuristic.ts */

export const HORIZONTAL_SCROLL_HEURISTIC_DEFAULTS = {
  /** Subpixel/layout tolerance before flagging overflow. */
  tolerancePx: 1,
} as const;

export type HorizontalScrollOverflowResult =
  | { ok: true }
  | {
      ok: false;
      overflowPx: number;
      scrollWidth: number;
      clientWidth: number;
    };

export function evaluateHorizontalScrollOverflow(
  scrollWidth: number,
  clientWidth: number,
  tolerancePx = HORIZONTAL_SCROLL_HEURISTIC_DEFAULTS.tolerancePx,
): HorizontalScrollOverflowResult {
  const overflowPx = scrollWidth - clientWidth;
  if (overflowPx <= tolerancePx) return { ok: true };
  return { ok: false, overflowPx, scrollWidth, clientWidth };
}

/** True when an element is wider than its layout box (ignores tolerance). */
export function elementOverflowsHorizontally(
  scrollWidth: number,
  clientWidth: number,
  tolerancePx = HORIZONTAL_SCROLL_HEURISTIC_DEFAULTS.tolerancePx,
): boolean {
  return scrollWidth - clientWidth > tolerancePx;
}
