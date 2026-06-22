/**
 * Vertical scroll sanity checks for Playwright smokes.
 * Catches page-level scroll lock and non-responsive scroll containers.
 */

export type ScrollSanityFailure = {
  ok: false;
  check: 'scroll-sanity';
  reason: string;
  details?: Record<string, unknown>;
};

export type ScrollSanitySuccess = { ok: true };

export type ScrollSanityResult = ScrollSanitySuccess | ScrollSanityFailure;

export type ScrollSanityPageOptions = {
  /** Scroll container to test (default: document.documentElement). */
  scrollRootSelector?: string;
  /** Minimum scrollHeight vs clientHeight to require wheel response. */
  minScrollablePx?: number;
};

/** Self-contained for Playwright page.evaluate (no nested helpers). */
export function runScrollSanityInBrowser(
  opts: ScrollSanityPageOptions = {},
): ScrollSanityResult {
  const html = document.documentElement;
  const body = document.body;
  const htmlStyle = window.getComputedStyle(html);
  const bodyStyle = body ? window.getComputedStyle(body) : null;
  const htmlLocked =
    (htmlStyle.overflowY === 'hidden' || htmlStyle.overflow === 'hidden') &&
    !html.hasAttribute('data-labs-scroll-lock-ok');
  const bodyLocked =
    body &&
    bodyStyle &&
    (bodyStyle.overflowY === 'hidden' || bodyStyle.overflow === 'hidden') &&
    !body.hasAttribute('data-labs-scroll-lock-ok');
  if (htmlLocked || bodyLocked) {
    return {
      ok: false,
      check: 'scroll-sanity',
      reason: 'document scroll is locked (overflow hidden on html/body)',
    };
  }

  const root = opts.scrollRootSelector
    ? (document.querySelector(opts.scrollRootSelector) as HTMLElement | null)
    : document.documentElement;
  if (!root) {
    return {
      ok: false,
      check: 'scroll-sanity',
      reason: 'scroll root not found',
      details: { scrollRootSelector: opts.scrollRootSelector },
    };
  }

  const minScrollable = opts.minScrollablePx ?? 40;
  const scrollHeight = root.scrollHeight;
  const clientHeight = root.clientHeight;
  const scrollable = scrollHeight - clientHeight;

  if (scrollable < minScrollable) {
    return { ok: true };
  }

  const before = root.scrollTop;
  root.scrollTop = before + Math.min(80, scrollable);
  const after = root.scrollTop;
  root.scrollTop = before;

  if (after <= before) {
    return {
      ok: false,
      check: 'scroll-sanity',
      reason: 'scroll container did not respond to programmatic scroll',
      details: { scrollHeight, clientHeight, scrollable, before, after },
    };
  }

  return { ok: true };
}
