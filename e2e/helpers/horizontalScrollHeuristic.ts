/**
 * Horizontal scroll heuristics for Playwright smokes.
 * Pure math: src/shared/test/horizontalScrollHeuristicCore.ts
 */

export { HORIZONTAL_SCROLL_HEURISTIC_DEFAULTS } from '../../src/shared/test/horizontalScrollHeuristicCore';

export type HorizontalScrollHeuristicFailure = {
  ok: false;
  check: 'horizontal-scroll';
  reason: string;
  details?: Record<string, unknown>;
};

export type HorizontalScrollHeuristicSuccess = { ok: true };

export type HorizontalScrollHeuristicResult = HorizontalScrollHeuristicSuccess | HorizontalScrollHeuristicFailure;

export type HorizontalScrollHeuristicPageOptions = {
  /** Element whose box should not scroll horizontally (e.g. main#main). */
  rootSelector: string;
  tolerancePx?: number;
  /**
   * Selectors for regions allowed to scroll horizontally (tables, wide notation).
   * Only the root is checked — opt-in regions must not expand the root itself.
   */
  allowHorizontalScrollSelectors?: string[];
};

/** Self-contained for Playwright page.evaluate (no closure imports). */
export function runHorizontalScrollHeuristicInBrowser(
  opts: HorizontalScrollHeuristicPageOptions,
): HorizontalScrollHeuristicResult {
  const tolerancePx = opts.tolerancePx ?? 1;
  const root = document.querySelector(opts.rootSelector);
  if (!root) {
    return {
      ok: false,
      check: 'horizontal-scroll',
      reason: 'root node not found',
      details: { rootSelector: opts.rootSelector },
    };
  }

  const rootEl = root as HTMLElement;
  const overflowPx = rootEl.scrollWidth - rootEl.clientWidth;
  if (overflowPx > tolerancePx) {
    let widestChild: { tag: string; className: string; overflowPx: number } | null = null;
    for (const child of rootEl.querySelectorAll('*')) {
      const el = child as HTMLElement;
      if (el.scrollWidth - el.clientWidth <= tolerancePx) continue;
      const candidate = {
        tag: el.tagName.toLowerCase(),
        className: el.className?.toString?.().slice(0, 120) ?? '',
        overflowPx: el.scrollWidth - el.clientWidth,
      };
      if (!widestChild || candidate.overflowPx > widestChild.overflowPx) {
        widestChild = candidate;
      }
    }

    return {
      ok: false,
      check: 'horizontal-scroll',
      reason: `root overflows horizontally by ${overflowPx}px`,
      details: {
        rootSelector: opts.rootSelector,
        scrollWidth: rootEl.scrollWidth,
        clientWidth: rootEl.clientWidth,
        overflowPx,
        widestChild,
        allowedSelectors: opts.allowHorizontalScrollSelectors ?? [],
      },
    };
  }

  return { ok: true };
}
