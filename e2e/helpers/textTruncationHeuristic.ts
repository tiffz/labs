export type TextTruncationIssue = {
  selector: string;
  text: string;
  scrollWidth: number;
  clientWidth: number;
};

export type TextTruncationResult =
  | { ok: true }
  | { ok: false; issues: TextTruncationIssue[] };

type TruncationOptions = {
  rootSelector?: string;
  /** Muted / secondary copy selectors to audit */
  textSelectors?: string[];
  /** Ignore elements narrower than this (px) */
  minWidthPx?: number;
};

/** Advisory — flags clipped text without ellipsis in primary chrome. */
export function runTextTruncationHeuristicInBrowser(options: TruncationOptions = {}): TextTruncationResult {
  const root = document.querySelector(options.rootSelector ?? 'main') ?? document.body;
  const selectors = options.textSelectors ?? ['h1', 'h2', '[role="heading"]', 'p', '.MuiTypography-root'];
  const minWidth = options.minWidthPx ?? 48;
  const issues: TextTruncationIssue[] = [];

  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.clientWidth < minWidth) continue;
      const style = window.getComputedStyle(el);
      if (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') continue;
      if (el.scrollWidth <= el.clientWidth + 1) continue;
      const text = (el.textContent ?? '').trim().slice(0, 80);
      if (!text) continue;
      issues.push({
        selector: sel,
        text,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
      if (issues.length >= 8) break;
    }
    if (issues.length >= 8) break;
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
