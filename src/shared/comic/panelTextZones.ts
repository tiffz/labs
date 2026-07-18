import type { LayoutBounds } from './speechBubbleLayout';

export type PanelTextZones = {
  bounds: LayoutBounds;
  topPad: number;
  characterBandTop: number;
  dialogueTop: number;
  dialogueBottom: number;
  sidePad: number;
};

const CHARACTER_BAND_RATIO = 0.26;
const TOP_PAD = 8;
const SIDE_PAD = 8;
const TAIL_GAP = 10;

/** Vertical bands for caption/dialogue vs character markers. */
export function panelTextZones(bounds: LayoutBounds): PanelTextZones {
  const characterBandTop = bounds.y + bounds.h * (1 - CHARACTER_BAND_RATIO);
  return {
    bounds,
    topPad: TOP_PAD,
    characterBandTop,
    dialogueTop: bounds.y + TOP_PAD,
    dialogueBottom: characterBandTop - TAIL_GAP,
    sidePad: SIDE_PAD,
  };
}

export function clampX(center: number, halfW: number, bounds: LayoutBounds, sidePad = SIDE_PAD): number {
  const min = bounds.x + sidePad + halfW;
  const max = bounds.x + bounds.w - sidePad - halfW;
  if (min > max) return bounds.x + bounds.w / 2;
  return Math.min(max, Math.max(min, center));
}

export function maxBubbleHalfWidth(bounds: LayoutBounds, sidePad = SIDE_PAD): number {
  const inner = bounds.w - sidePad * 2;
  return Math.max(6, Math.min(inner / 2 - 1, inner * 0.48));
}
