/**
 * Layout heuristics for Playwright smokes — padding + contrast “obvious bad” checks.
 * Pure math: src/shared/test/layoutHeuristicsCore.ts (keep browser fn in sync).
 */

export { LAYOUT_HEURISTIC_DEFAULTS } from '../../src/shared/test/layoutHeuristicsCore';

export type LayoutHeuristicFailure = {
  ok: false;
  check: 'padding' | 'contrast';
  reason: string;
  details?: Record<string, unknown>;
};

export type LayoutHeuristicSuccess = { ok: true };

export type LayoutHeuristicResult = LayoutHeuristicSuccess | LayoutHeuristicFailure;

export type LayoutHeuristicPageOptions = {
  containerSelector: string;
  contentSelector: string;
  mutedTextSelector: string;
  minEdgePaddingPx?: number;
  minBodyContrast?: number;
};

/** Self-contained for Playwright page.evaluate (no closure imports). */
export function runLayoutHeuristicsInBrowser(
  opts: LayoutHeuristicPageOptions,
): LayoutHeuristicResult {
  const minPad = opts.minEdgePaddingPx ?? 10;
  const minContrast = opts.minBodyContrast ?? 4;

  const parseColor = (color: string): [number, number, number] | null => {
    const trimmed = color.trim();
    if (!trimmed || trimmed === 'transparent') return null;
    const rgba = trimmed.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
    if (rgba) {
      if (Number(rgba[4]) < 0.05) return null;
      return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
    }
    const hex = trimmed.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const h = hex[1]!;
      if (h.length === 3) {
        return [
          parseInt(h[0]! + h[0], 16),
          parseInt(h[1]! + h[1], 16),
          parseInt(h[2]! + h[2], 16),
        ];
      }
      if (h.length >= 6) {
        return [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
        ];
      }
    }
    const rgb = trimmed.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
    if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return null;
  };

  const resolveBackgroundRgb = (start: Element): [number, number, number] => {
    let el: Element | null = start;
    while (el && el !== document.documentElement) {
      const bgRgb = parseColor(window.getComputedStyle(el).backgroundColor);
      if (bgRgb) return bgRgb;
      el = el.parentElement;
    }
    const htmlBg = parseColor(window.getComputedStyle(document.documentElement).backgroundColor);
    if (htmlBg) return htmlBg;
    const bodyBg = parseColor(window.getComputedStyle(document.body).backgroundColor);
    if (bodyBg) return bodyBg;
    return [255, 255, 255];
  };

  const luminance = (r: number, g: number, b: number): number => {
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (fg: [number, number, number], bg: [number, number, number]): number => {
    const l1 = luminance(...fg);
    const l2 = luminance(...bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const container = document.querySelector(opts.containerSelector);
  const content = document.querySelector(opts.contentSelector);
  const muted = document.querySelector(opts.mutedTextSelector);

  if (!container || !content) {
    return {
      ok: false,
      check: 'padding',
      reason: 'missing container or content node',
      details: {
        container: Boolean(container),
        content: Boolean(content),
      },
    };
  }

  const containerRect = container.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const inset = {
    left: contentRect.left - containerRect.left,
    right: containerRect.right - contentRect.right,
    top: contentRect.top - containerRect.top,
    bottom: containerRect.bottom - contentRect.bottom,
  };

  if (
    inset.left < minPad ||
    inset.right < minPad ||
    inset.top < minPad ||
    inset.bottom < minPad
  ) {
    return {
      ok: false,
      check: 'padding',
      reason: `content inset below ${minPad}px`,
      details: { inset, containerSelector: opts.containerSelector },
    };
  }

  if (!muted) {
    return {
      ok: false,
      check: 'contrast',
      reason: 'muted text sample not found',
      details: { mutedTextSelector: opts.mutedTextSelector },
    };
  }

  const mutedStyle = window.getComputedStyle(muted);
  const fg = parseColor(mutedStyle.color);
  if (!fg) {
    return {
      ok: false,
      check: 'contrast',
      reason: 'could not parse muted text color',
      details: { color: mutedStyle.color },
    };
  }

  const bgRgb = resolveBackgroundRgb(muted);

  const ratio = contrast(fg, bgRgb);
  if (ratio < minContrast) {
    return {
      ok: false,
      check: 'contrast',
      reason: `muted text contrast ${ratio.toFixed(2)} below ${minContrast}`,
      details: { ratio, fgColor: mutedStyle.color, bgColor: bgRgb.join(',') },
    };
  }

  return { ok: true };
}
