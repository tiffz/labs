import type { PanelClipPoint, PanelRect } from './types';

export type PanelPixelBounds = { x: number; y: number; w: number; h: number };

const RECT_CLIP: PanelClipPoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** Resolve polygon clip for a panel (normalized 0–1 inside its bounding box). */
export function resolvePanelClip(panel: PanelRect): PanelClipPoint[] {
  if (panel.clip && panel.clip.length >= 3) {
    return panel.clip;
  }

  const bias = panel.diagonalBias ?? 0.14;
  switch (panel.shape ?? 'rect') {
    case 'parallelogram': {
      // Keep slanted edges inside the AABB so adjacent slant-row panels never overlap.
      const b = Math.min(0.28, Math.max(0.06, Math.abs(bias)));
      if (bias >= 0) {
        return [
          { x: b, y: 0 },
          { x: 1, y: 0 },
          { x: 1 - b, y: 1 },
          { x: 0, y: 1 },
        ];
      }
      return [
        { x: 0, y: 0 },
        { x: 1 - b, y: 0 },
        { x: 1, y: 1 },
        { x: b, y: 1 },
      ];
    }
    case 'trapezoid-top-narrow':
      return [
        { x: bias, y: 0 },
        { x: 1 - bias, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
    case 'trapezoid-bottom-narrow':
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1 - bias, y: 1 },
        { x: bias, y: 1 },
      ];
    case 'triangle-up':
      return [
        { x: 0.5, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
    case 'triangle-down':
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ];
    case 'triangle-left':
      return [
        { x: 0, y: 0.5 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ];
    case 'triangle-right':
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0.5 },
        { x: 0, y: 1 },
      ];
    case 'pentagon':
      return [
        { x: 0.5, y: 0 },
        { x: 1, y: 0.38 },
        { x: 0.82, y: 1 },
        { x: 0.18, y: 1 },
        { x: 0, y: 0.38 },
      ];
    case 'diagonal-split-tl':
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ];
    case 'diagonal-split-br':
      return [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
    case 'circle': {
      const points: PanelClipPoint[] = [];
      const segments = 24;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
        points.push({
          x: 0.5 + Math.cos(angle) * 0.5,
          y: 0.5 + Math.sin(angle) * 0.5,
        });
      }
      return points;
    }
    case 'rect':
    default:
      return RECT_CLIP;
  }
}

export function panelClipToPixelPoints(clip: PanelClipPoint[], bounds: PanelPixelBounds): string {
  return clip
    .map((point) => {
      const x = bounds.x + point.x * bounds.w;
      const y = bounds.y + point.y * bounds.h;
      return `${x},${y}`;
    })
    .join(' ');
}

export function panelSvgPointsAttr(clip: PanelClipPoint[], bounds: PanelPixelBounds): string {
  return panelClipToPixelPoints(clip, bounds);
}

export function panelCircleClipAttrs(bounds: PanelPixelBounds): { cx: number; cy: number; r: number } {
  const r = Math.min(bounds.w, bounds.h) / 2;
  return {
    cx: bounds.x + bounds.w / 2,
    cy: bounds.y + bounds.h / 2,
    r,
  };
}

/**
 * Layout box for cast markers / dialogue anchors.
 * Circle panels use an inscribed square (inset for stroke) so slot y≈0.8 stays inside the disc
 * instead of the AABB corners that sit outside the circle.
 */
export function markerLayoutBounds(
  bounds: PanelPixelBounds,
  shape: PanelRect['shape'] | undefined,
  strokePad = 4,
): PanelPixelBounds {
  if (shape === 'circle') {
    const { cx, cy, r } = panelCircleClipAttrs(bounds);
    const usable = Math.max(8, r - strokePad - Math.max(3, r * 0.08));
    const half = usable / Math.SQRT2;
    return {
      x: cx - half,
      y: cy - half,
      w: half * 2,
      h: half * 2,
    };
  }
  /* Deep bottom inset — tall emoji bitmaps must not spill into the next grid cell. */
  const padX = Math.min(bounds.w * 0.14, 26);
  const padBottom = Math.min(bounds.h * 0.26, 56);
  const padTop = Math.min(bounds.h * 0.08, 16);
  return {
    x: bounds.x + padX,
    y: bounds.y + padTop,
    w: Math.max(8, bounds.w - padX * 2),
    h: Math.max(8, bounds.h - padTop - padBottom),
  };
}

/** Expand trim-space panel bounds when explicitly marked full-bleed. */
export function panelPixelBounds(
  panel: PanelRect,
  width: number,
  height: number,
  pad = 2,
): PanelPixelBounds {
  if (panel.bleedMode === 'full-bleed') {
    return { x: 0, y: 0, w: width, h: height };
  }
  const px = panel.x * width;
  const py = panel.y * height;
  const pw = panel.width * width;
  const ph = panel.height * height;
  return {
    x: px + pad,
    y: py + pad,
    w: Math.max(0, pw - pad * 2),
    h: Math.max(0, ph - pad * 2),
  };
}
