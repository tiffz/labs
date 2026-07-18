import type { ReactElement } from 'react';

import type { MarkerPlacement } from './characterArrangements';
import { emojiRasterImageSize } from './emojiRasterize';
import { activeMarkerPlacement } from './markerPlacementScope';
import type { PanelCharacterId } from './types';

/** Geometric A/B/C defaults (Lyrefly). Scrapboard emoji uses arrangement slots instead. */
export const CHARACTER_MARKER_SLOTS: Record<PanelCharacterId, { x: number; y: number }> = {
  a: { x: 0.26, y: 0.8 },
  b: { x: 0.74, y: 0.8 },
  c: { x: 0.5, y: 0.84 },
};

/** Must stay in sync with EmojiCharacterMarker glyph + outline sizing. */
const EMOJI_GLYPH_SIZE_RATIO = 1.55;
const EMOJI_OUTLINE_RATIO = 0.1;

/** Half of the painted emoji bitmap (glyph + solid outline pad). */
export function emojiPaintHalfExtent(markerSize: number): number {
  const fontSize = Math.max(14, markerSize * EMOJI_GLYPH_SIZE_RATIO);
  const outlinePx = Math.max(2, Math.round(fontSize * EMOJI_OUTLINE_RATIO));
  return emojiRasterImageSize(fontSize, outlinePx) / 2;
}

export const CHARACTER_MARKER_LABELS: Record<PanelCharacterId, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
};

type MarkerBounds = { x: number; y: number; w: number; h: number };

export type CharacterMarkerBox = {
  cx: number;
  cy: number;
  size: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

function resolvePlacement(placement?: MarkerPlacement): MarkerPlacement | undefined {
  return placement ?? activeMarkerPlacement();
}

function slotPosition(
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { x: number; y: number; scale: number } {
  const resolved = resolvePlacement(placement);
  const override = resolved?.[characterId];
  if (override) return override;
  const fallback = CHARACTER_MARKER_SLOTS[characterId];
  return { x: fallback.x, y: fallback.y, scale: 1 };
}

export function characterMarkerBox(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): CharacterMarkerBox {
  let { cx, cy } = markerCenter(bounds, characterId, placement);
  const scale = slotPosition(characterId, placement).scale;
  const size = markerSize(bounds, characterId, placement) * scale;
  const emoji = Boolean(resolvePlacement(placement)?.[characterId]);
  if (emoji) {
    /* Keep the full painted bitmap inside layout bounds — otherwise feet clip under
       the panel stroke or get covered by the next panel’s fill in a grid. */
    const half = emojiPaintHalfExtent(size);
    const pad = 2;
    const minX = bounds.x + half + pad;
    const maxX = bounds.x + bounds.w - half - pad;
    const minY = bounds.y + half + pad;
    const maxY = bounds.y + bounds.h - half - pad;
    if (minX <= maxX) cx = Math.min(maxX, Math.max(minX, cx));
    if (minY <= maxY) cy = Math.min(maxY, Math.max(minY, cy));
  }
  const extent = emoji ? emojiPaintHalfExtent(size) / size : 1.1;
  return {
    cx,
    cy,
    size,
    top: cy - size * extent,
    bottom: cy + size * extent,
    left: cx - size * extent,
    right: cx + size * extent,
  };
}

/**
 * Layout overlap box for bubbles/SFX.
 * Emoji / arrangement markers paint a full bitmap around `cy` — use that extent so
 * balloons cannot sit on heads. Geometric A/B/C markers still ignore decorative tips.
 */
export function characterMarkerLayoutBox(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): CharacterMarkerBox {
  const box = characterMarkerBox(bounds, characterId, placement);
  if (resolvePlacement(placement)?.[characterId]) {
    const half = emojiPaintHalfExtent(box.size);
    return {
      ...box,
      top: box.cy - half,
      bottom: box.cy + half,
      left: box.cx - half,
      right: box.cx + half,
    };
  }
  /* Geometric markers: ignore decorative tips above the head. */
  return {
    ...box,
    top: box.cy - box.size * 0.2,
  };
}

function markerSize(
  bounds: MarkerBounds,
  characterId?: PanelCharacterId,
  placement?: MarkerPlacement,
): number {
  const minSide = Math.min(bounds.w, bounds.h);
  /* Scrapboard emoji cast reads as characters; geometric A/B/C stay compact for Lyrefly. */
  if (characterId && resolvePlacement(placement)?.[characterId]) {
    return minSide * 0.185;
  }
  return minSide * 0.1;
}

function markerCenter(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { cx: number; cy: number } {
  const slot = slotPosition(characterId, placement);
  /* Prefer mid-lower band; paint-extent clamp in characterMarkerBox is the hard stop. */
  const edge = resolvePlacement(placement)?.[characterId] ? 0.18 : 0;
  const x = edge > 0 ? Math.min(1 - edge, Math.max(edge, slot.x)) : slot.x;
  const y = edge > 0 ? Math.min(0.76, Math.max(0.2, slot.y)) : slot.y;
  return {
    cx: bounds.x + bounds.w * x,
    cy: bounds.y + bounds.h * y,
  };
}

function trianglePath(cx: number, cy: number, size: number): string {
  const h = size * 1.15;
  return `M ${cx} ${cy - h * 0.62} L ${cx + size} ${cy + h * 0.45} L ${cx - size} ${cy + h * 0.45} Z`;
}

function squarePath(cx: number, cy: number, size: number): string {
  return `M ${cx - size} ${cy - size} H ${cx + size} V ${cy + size} H ${cx - size} Z`;
}

/** Legacy geometric A/B/C markers (Lyrefly / non-emoji path). */
export function renderCharacterMarker(
  characterId: PanelCharacterId,
  bounds: MarkerBounds,
  color: string,
  strokeWidth: number,
  placement?: MarkerPlacement,
): ReactElement {
  const { cx, cy, size } = characterMarkerBox(bounds, characterId, placement);
  const label = CHARACTER_MARKER_LABELS[characterId];

  let shape: ReactElement;
  if (characterId === 'a') {
    shape = <path d={trianglePath(cx, cy, size)} fill="#fff" stroke={color} strokeWidth={strokeWidth} />;
  } else if (characterId === 'b') {
    shape = (
      <circle cx={cx} cy={cy} r={size} fill="#fff" stroke={color} strokeWidth={strokeWidth} />
    );
  } else {
    shape = <path d={squarePath(cx, cy, size * 0.88)} fill="#fff" stroke={color} strokeWidth={strokeWidth} />;
  }

  return (
    <g key={`marker-${characterId}`} className="comic-mockup-svg__character-marker">
      {shape}
      <text
        x={cx}
        y={cy + size * 0.35}
        textAnchor="middle"
        fontSize={Math.max(8, size * 0.75)}
        fontWeight="700"
        fill={color}
        fontFamily={'"Comic Sans MS", "Comic Neue", cursive, sans-serif'}
      >
        {label}
      </text>
    </g>
  );
}

/** Tail target — shape-specific anchor (apex / circle top / square top). */
export function characterTailAnchor(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { x: number; y: number } {
  const box = characterMarkerBox(bounds, characterId, placement);
  const { cx, cy, size } = box;
  if (resolvePlacement(placement)?.[characterId]) {
    // Emoji / arrangement: tip above the glyph so the balloon body clears the head.
    return { x: cx, y: cy - size * 1.2 };
  }
  if (characterId === 'a') {
    const h = size * 1.15;
    return { x: cx, y: cy - h * 0.48 };
  }
  if (characterId === 'b') {
    return { x: cx, y: cy - size * 0.88 };
  }
  const half = size * 0.88;
  return { x: cx, y: cy - half * 0.82 };
}

/** @deprecated Use characterTailAnchor */
export function characterHeadPoint(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { x: number; y: number } {
  return characterTailAnchor(bounds, characterId, placement);
}

/** @deprecated Use characterHeadPoint */
export function characterMarkerPoint(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { x: number; y: number } {
  return characterHeadPoint(bounds, characterId, placement);
}

export function renderHorizonScene(
  bounds: MarkerBounds,
  inkColor: string,
  strokeWidth: number,
  skyColor = '#dce9f5',
  groundColor = '#e8dcc8',
): ReactElement {
  const { x, y, w, h } = bounds;
  const horizonY = y + h * 0.56;
  return (
    <g className="comic-mockup-svg__horizon">
      <rect x={x} y={y} width={w} height={horizonY - y} fill={skyColor} />
      <rect x={x} y={horizonY} width={w} height={y + h - horizonY} fill={groundColor} />
      <line
        x1={x + w * 0.04}
        y1={horizonY}
        x2={x + w * 0.96}
        y2={horizonY}
        stroke={inkColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </g>
  );
}
