/**
 * Pure popover viewport-fit math — keep in sync with the e2e helper that measures
 * open `.labs-popover-surface` elements. Detects the class of bug where a clamped
 * popover (maxHeight + overflow:hidden Paper) contains content taller than its box
 * but no descendant actually scrolls, so the bottom is clipped and unreachable
 * (root cause: a flex-column scroll child missing `min-height: 0`).
 */

export const POPOVER_VIEWPORT_FIT_DEFAULTS = {
  /** Subpixel/layout tolerance before flagging. */
  tolerancePx: 1,
} as const;

export type PopoverViewportFitInput = {
  /** The popover Paper's bottom edge in viewport coordinates. */
  paperBottom: number;
  /** window.innerHeight. */
  viewportHeight: number;
  /** Natural height of the panel content (tallest child scrollHeight). */
  contentHeight: number;
  /** The Paper's visible (client) box height. */
  paperClientHeight: number;
  /** max(scrollHeight - clientHeight) over scrollable descendants — >tol means a real scroll container exists. */
  scrollableOverflowPx: number;
  tolerancePx?: number;
};

export type PopoverViewportFitResult =
  | { ok: true }
  | { ok: false; reason: 'paper-exceeds-viewport' | 'content-clamped-not-scrollable'; detailPx: number };

/**
 * Returns ok, or the first violation:
 * - `paper-exceeds-viewport`: the Paper itself runs past the bottom of the screen.
 * - `content-clamped-not-scrollable`: content is taller than the Paper's box, but
 *   nothing scrolls — the bottom is unreachable. This is the Encore section-playback
 *   menu bug (missing `min-height: 0` on the flex scroll child).
 */
export function evaluatePopoverViewportFit(
  input: PopoverViewportFitInput,
): PopoverViewportFitResult {
  const tol = input.tolerancePx ?? POPOVER_VIEWPORT_FIT_DEFAULTS.tolerancePx;

  const paperOverflow = input.paperBottom - input.viewportHeight;
  if (paperOverflow > tol) {
    return { ok: false, reason: 'paper-exceeds-viewport', detailPx: paperOverflow };
  }

  const clampedOverflow = input.contentHeight - input.paperClientHeight;
  if (clampedOverflow > tol && input.scrollableOverflowPx <= tol) {
    return { ok: false, reason: 'content-clamped-not-scrollable', detailPx: clampedOverflow };
  }

  return { ok: true };
}
