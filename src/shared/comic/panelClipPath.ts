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
    case 'parallelogram':
      return [
        { x: bias, y: 0 },
        { x: 1 + bias, y: 0 },
        { x: 1 - bias, y: 1 },
        { x: -bias, y: 1 },
      ];
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
