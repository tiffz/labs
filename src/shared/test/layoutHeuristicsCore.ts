/** Pure layout heuristic math — unit-tested; keep in sync with e2e/helpers/layoutHeuristics.ts browser fn. */

export const LAYOUT_HEURISTIC_DEFAULTS = {
  minEdgePaddingPx: 10,
  /** WCAG AA body text; use 4.0 only when design tokens are intentionally softer but still readable. */
  minBodyContrast: 4,
  minLargeTextContrast: 3,
  largeTextMinPx: 18,
} as const;

export function parseCssColorToRgb(color: string): [number, number, number] | null {
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
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  return null;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function edgeInsetPx(
  inner: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  outer: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
): { left: number; right: number; top: number; bottom: number } {
  return {
    left: inner.left - outer.left,
    right: outer.right - inner.right,
    top: inner.top - outer.top,
    bottom: outer.bottom - inner.bottom,
  };
}
