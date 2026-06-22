/**
 * DOM contrast audit for Playwright smokes — scans visible text nodes under a root.
 * Pure math: src/shared/test/contrastAuditCore.ts (keep browser fn in sync).
 */

export {
  CONTRAST_AUDIT_DEFAULTS,
  type ContrastAuditFailure,
  type ContrastAuditResult,
  type ContrastViolation,
} from '../../src/shared/test/contrastAuditCore';

import type { ContrastViolation } from '../../src/shared/test/contrastAuditCore';

export type ContrastAuditPageOptions = {
  rootSelector: string;
  minBodyContrast?: number;
  minLargeTextContrast?: number;
  /** Max violations returned (keeps failure messages readable). */
  maxViolations?: number;
};

/** Self-contained for Playwright page.evaluate (no closure imports). */
export function runContrastAuditInBrowser(opts: ContrastAuditPageOptions): ContrastAuditResult {
  const minBody = opts.minBodyContrast ?? 4.5;
  const minLarge = opts.minLargeTextContrast ?? 3;
  const maxViolations = opts.maxViolations ?? 8;

  const parseColor = (color: string): [number, number, number] | null => {
    const trimmed = color.trim();
    if (!trimmed || trimmed === 'transparent') return null;
    const rgba = trimmed.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
    if (rgba) {
      if (Number(rgba[4]) < 0.5) return null;
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

  const requiredRatio = (fontSizePx: number, fontWeight: string): number => {
    const weight = parseInt(fontWeight, 10) || 400;
    const isLarge = fontSizePx >= 18 || (fontSizePx >= 14 && weight >= 700);
    return isLarge ? minLarge : minBody;
  };

  const isVisible = (el: Element): boolean => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) < 0.05) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const root = document.querySelector(opts.rootSelector);
  if (!root) {
    return {
      ok: false,
      violations: [
        {
          text: '',
          ratio: 0,
          required: minBody,
          fgColor: '',
          bgColor: '',
          tag: 'missing-root',
          className: opts.rootSelector,
        },
      ],
    };
  }

  const violations: ContrastViolation[] = [];
  const seen = new Set<string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const raw = walker.currentNode.textContent ?? '';
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const el = walker.currentNode.parentElement;
    if (!el || !root.contains(el) || !isVisible(el)) continue;

    const style = window.getComputedStyle(el);
    const fg = parseColor(style.color);
    if (!fg) continue;

    const bgRgb = resolveBackgroundRgb(el);
    const ratio = contrast(fg, bgRgb);
    const fontSizePx = parseFloat(style.fontSize) || 16;
    const required = requiredRatio(fontSizePx, style.fontWeight);
    if (ratio + 0.01 >= required) continue;

    const key = `${text.slice(0, 40)}|${style.color}|${bgRgb.join(',')}|${el.tagName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    violations.push({
      text: text.slice(0, 80),
      ratio,
      required,
      fgColor: style.color,
      bgColor: `rgb(${bgRgb.join(', ')})`,
      tag: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className : '',
    });

    if (violations.length >= maxViolations) break;
  }

  if (violations.length > 0) {
    return { ok: false, violations };
  }

  return { ok: true };
}
