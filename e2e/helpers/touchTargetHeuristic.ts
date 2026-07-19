/**
 * Coarse-pointer touch-target heuristic for Playwright smokes.
 * Flags visible interactive elements whose hit area is below the WCAG 2.5.8
 * minimum (24x24 CSS px). 44px is the Material comfort target; 24px is the
 * "obviously bad" floor this heuristic enforces.
 */

export type TouchTargetHeuristicFailure = {
  ok: false;
  check: 'touch-target';
  reason: string;
  details?: Record<string, unknown>;
};

export type TouchTargetHeuristicSuccess = { ok: true };

export type TouchTargetHeuristicResult = TouchTargetHeuristicSuccess | TouchTargetHeuristicFailure;

export type TouchTargetHeuristicPageOptions = {
  /** Scope for the scan (e.g. main#main). */
  rootSelector: string;
  /** Minimum width/height in CSS px (default 24 = WCAG 2.5.8 floor). */
  minSizePx?: number;
  /**
   * Selectors for regions exempt from the check (dense desktop-only chrome,
   * notation glyph buttons, list rows with large row-level hit areas).
   */
  allowSmallTargetSelectors?: string[];
  /** Max offenders to report. */
  maxReported?: number;
};

/** Self-contained for Playwright page.evaluate (no closure imports). */
export function runTouchTargetHeuristicInBrowser(
  opts: TouchTargetHeuristicPageOptions,
): TouchTargetHeuristicResult {
  const minSize = opts.minSizePx ?? 24;
  const maxReported = opts.maxReported ?? 8;
  const allowedSelectors = [
    '[data-labs-allow-small-touch-target]',
    ...(opts.allowSmallTargetSelectors ?? []),
  ];

  const root = document.querySelector(opts.rootSelector);
  if (!root) {
    return {
      ok: false,
      check: 'touch-target',
      reason: 'root node not found',
      details: { rootSelector: opts.rootSelector },
    };
  }

  const isAllowed = (el: Element): boolean => {
    for (const selector of allowedSelectors) {
      try {
        if (el.closest(selector)) return true;
      } catch {
        /* invalid selector — skip */
      }
    }
    return false;
  };

  const interactive = root.querySelectorAll(
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]',
  );
  const offenders: Array<{ tag: string; label: string; width: number; height: number }> = [];

  for (const el of interactive) {
    let rect = el.getBoundingClientRect();
    // Hidden / collapsed / offscreen elements are not tappable surfaces.
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    // Native range sliders: hit area is user-agent determined (WCAG 2.5.8 exception).
    if (el instanceof HTMLInputElement && el.type === 'range') continue;
    // sr-only inputs (1px clipped) delegate their hit area to a styled proxy.
    if (rect.width <= 2 && rect.height <= 2 && style.position === 'absolute') continue;
    // Label-wrapped or label-associated controls: the label is the tap target.
    const wrappingLabel = el.closest('label');
    if (wrappingLabel) {
      rect = wrappingLabel.getBoundingClientRect();
    } else if (el.id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (forLabel) {
        const labelRect = forLabel.getBoundingClientRect();
        if (labelRect.width > rect.width || labelRect.height > rect.height) rect = labelRect;
      }
    }
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.width + 0.5 >= minSize && rect.height + 0.5 >= minSize) continue;
    // Inline links inside prose are exempt per WCAG 2.5.8.
    if (el.tagName === 'A' && style.display === 'inline') continue;
    if (isAllowed(el)) continue;
    offenders.push({
      tag: el.tagName.toLowerCase(),
      label:
        (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 60) ||
        `.${el.className?.toString?.().slice(0, 60) ?? ''}`,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
    if (offenders.length >= maxReported) break;
  }

  if (offenders.length === 0) return { ok: true };
  return {
    ok: false,
    check: 'touch-target',
    reason: `${offenders.length}+ interactive elements below ${minSize}x${minSize}px`,
    details: { minSize, offenders },
  };
}
