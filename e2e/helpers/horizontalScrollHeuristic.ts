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
   * Overflow confined to these hosts is permitted.
   */
  allowHorizontalScrollSelectors?: string[];
};

function isInsideAllowedHorizontalScrollHost(
  el: Element,
  allowedSelectors: string[],
): boolean {
  if (el.closest('[data-labs-allow-horizontal-scroll]')) return true;
  for (const selector of allowedSelectors) {
    try {
      if (el.closest(selector)) return true;
    } catch {
      /* invalid selector — skip */
    }
  }
  return false;
}

/** Self-contained for Playwright page.evaluate (no closure imports). */
export function runHorizontalScrollHeuristicInBrowser(
  opts: HorizontalScrollHeuristicPageOptions,
): HorizontalScrollHeuristicResult {
  const tolerancePx = opts.tolerancePx ?? 1;
  const allowedSelectors = [
    '[data-labs-allow-horizontal-scroll]',
    '.labs-horizontal-scroll-host',
    ...(opts.allowHorizontalScrollSelectors ?? []),
  ];

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
  if (overflowPx <= tolerancePx) {
    return { ok: true };
  }

  let widestChild: { tag: string; className: string; overflowPx: number; allowed: boolean } | null =
    null;
  for (const child of rootEl.querySelectorAll('*')) {
    const el = child as HTMLElement;
    if (el.scrollWidth - el.clientWidth <= tolerancePx) continue;
    const candidate = {
      tag: el.tagName.toLowerCase(),
      className: el.className?.toString?.().slice(0, 120) ?? '',
      overflowPx: el.scrollWidth - el.clientWidth,
      allowed: isInsideAllowedHorizontalScrollHost(el, allowedSelectors),
    };
    if (!widestChild || candidate.overflowPx > widestChild.overflowPx) {
      widestChild = candidate;
    }
  }

  if (widestChild?.allowed) {
    return { ok: true };
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
      allowedSelectors,
    },
  };
}
