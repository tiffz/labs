import type { ReactElement } from 'react';

import type { MarkerPlacement } from './characterArrangements';
import { activeMarkerPlacement } from './markerPlacementScope';
import type { PanelCharacterId } from './types';

export const CHARACTER_MARKER_SLOTS: Record<PanelCharacterId, { x: number; y: number }> = {
  a: { x: 0.26, y: 0.8 },
  b: { x: 0.74, y: 0.8 },
  c: { x: 0.5, y: 0.84 },
};

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
  const { cx, cy } = markerCenter(bounds, characterId, placement);
  const scale = slotPosition(characterId, placement).scale;
  const size = markerSize(bounds) * scale;
  return {
    cx,
    cy,
    size,
    top: cy - size * 1.1,
    bottom: cy + size * 1.1,
    left: cx - size * 1.1,
    right: cx + size * 1.1,
  };
}

/** Layout overlap uses body box — excludes decorative shape tips above the head. */
export function characterMarkerLayoutBox(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): CharacterMarkerBox {
  const box = characterMarkerBox(bounds, characterId, placement);
  return {
    ...box,
    top: box.cy - box.size * 0.2,
  };
}

function markerSize(bounds: MarkerBounds): number {
  return Math.min(bounds.w, bounds.h) * 0.1;
}

function markerCenter(
  bounds: MarkerBounds,
  characterId: PanelCharacterId,
  placement?: MarkerPlacement,
): { cx: number; cy: number } {
  const slot = slotPosition(characterId, placement);
  return {
    cx: bounds.x + bounds.w * slot.x,
    cy: bounds.y + bounds.h * slot.y,
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

/**
 * Emoji cast marker — native color emoji only (no tinted halos; those read as grey discs).
 */
export function renderEmojiCharacterMarker(
  characterId: PanelCharacterId,
  bounds: MarkerBounds,
  emoji: string,
  _tintColor: string,
  _washFilterId: string | undefined,
  placement?: MarkerPlacement,
): ReactElement {
  const { cx, cy, size } = characterMarkerBox(bounds, characterId, placement);
  const fontSize = Math.max(14, size * 1.85);
  return (
    <g
      key={`emoji-marker-${characterId}`}
      className="comic-mockup-svg__character-marker comic-mockup-svg__character-marker--emoji"
    >
      <text
        x={cx}
        y={cy + fontSize * 0.32}
        textAnchor="middle"
        fontSize={fontSize}
        style={{ fontFamily: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}
      >
        {emoji}
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
    // Emoji / arrangement: tip just above the glyph.
    return { x: cx, y: cy - size * 0.95 };
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
