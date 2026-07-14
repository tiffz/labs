import {
  forceCollide,
  forceLink,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

import { characterMarkerLayoutBox, characterTailAnchor } from './characterMarkers';
import { clampX, panelTextZones, type PanelTextZones } from './panelTextZones';
import type { LayoutBounds, SpeechBubbleLayout } from './speechBubbleLayout';
import type { PanelCharacterId } from './types';

const COLLIDE_MARGIN = 5;
const FORCE_TICKS = 80;
const BUBBLE_ABOVE_CHARACTER_GAP = 10;
const OVERLAP_MARGIN = 5;

/** Horizontal column bias — separates multi-speaker panels (A left, C center, B right). */
const CHARACTER_CX_RATIO: Record<PanelCharacterId, number> = {
  a: 0.28,
  b: 0.74,
  c: 0.5,
};

export type ForceObstacle = {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
};

export type PlaceBubblesWithForceOptions = {
  bounds: LayoutBounds;
  allowBubbleEscape?: boolean;
  obstacles?: ForceObstacle[];
  ticks?: number;
};

type ForceNode = SimulationNodeDatum & {
  id: string;
  kind: 'bubble' | 'marker' | 'obstacle';
  r: number;
  targetX: number;
  targetY: number;
  bubbleIndex?: number;
};

type ForceLink = SimulationLinkDatum<ForceNode> & {
  distance: number;
};

function dialogueTop(zones: PanelTextZones, allowEscape: boolean): number {
  return allowEscape ? zones.bounds.y + 2 : zones.dialogueTop;
}

function preferredBubbleCx(
  bounds: LayoutBounds,
  characterId: PanelCharacterId,
  halfW: number,
  tailX: number,
  sidePad: number,
): number {
  const columnX = bounds.x + bounds.w * CHARACTER_CX_RATIO[characterId];
  const blended = tailX * 0.28 + columnX * 0.72;
  return clampX(blended, halfW, bounds, sidePad);
}

function collideRadius(halfW: number, halfH: number): number {
  return Math.hypot(halfW, halfH * 0.55) + COLLIDE_MARGIN;
}

function markerRadius(bounds: LayoutBounds, characterId: PanelCharacterId): number {
  const box = characterMarkerLayoutBox(bounds, characterId);
  return Math.max(box.size * 0.85, (box.bottom - box.top) / 2) + COLLIDE_MARGIN;
}

function boxesOverlap(a: SpeechBubbleLayout, b: SpeechBubbleLayout, margin = OVERLAP_MARGIN): boolean {
  return !(
    a.cx + a.halfW + margin <= b.cx - b.halfW ||
    b.cx + b.halfW + margin <= a.cx - a.halfW ||
    a.cy + a.halfH + margin <= b.cy - b.halfH ||
    b.cy + b.halfH + margin <= a.cy - a.halfH
  );
}

function horizontalOverlap(a: SpeechBubbleLayout, b: SpeechBubbleLayout, margin = OVERLAP_MARGIN): boolean {
  return !(a.cx + a.halfW + margin <= b.cx - b.halfW || b.cx + b.halfW + margin <= a.cx - a.halfW);
}

function obstacleOverlapsBubbleX(obstacle: ForceObstacle, bubble: SpeechBubbleLayout): boolean {
  return !(
    obstacle.cx + obstacle.halfW + OVERLAP_MARGIN <= bubble.cx - bubble.halfW ||
    bubble.cx + bubble.halfW + OVERLAP_MARGIN <= obstacle.cx - obstacle.halfW
  );
}

function maxBubbleCy(bubble: SpeechBubbleLayout, zones: PanelTextZones): number {
  // Match invariant: bubbleBottom <= tailY - 4  →  cy <= tailY - halfH - 4
  const tailMax = bubble.tailY - bubble.halfH - 4;
  const bandMax = zones.dialogueBottom - bubble.halfH;
  return Math.min(bandMax, tailMax);
}

function minBubbleCy(
  bubble: SpeechBubbleLayout,
  zones: PanelTextZones,
  allowEscape: boolean,
  obstacles: ForceObstacle[],
): number {
  let top = dialogueTop(zones, allowEscape);
  for (const obstacle of obstacles) {
    if (obstacleOverlapsBubbleX(obstacle, bubble)) {
      top = Math.max(top, obstacle.cy + obstacle.halfH + OVERLAP_MARGIN);
    }
  }
  return top + bubble.halfH;
}

/**
 * Headless fixed-tick d3-force placement for pre-sized bubbles.
 * Mutates `bubbles` centers only; does not re-run after callers clamp/refit.
 */
export function placeBubblesWithForce(
  bubbles: SpeechBubbleLayout[],
  options: PlaceBubblesWithForceOptions,
): void {
  if (bubbles.length === 0) return;

  const { bounds, allowBubbleEscape = false, obstacles = [], ticks = FORCE_TICKS } = options;
  const zones = panelTextZones(bounds);

  for (let index = 0; index < bubbles.length; index++) {
    const bubble = bubbles[index]!;
    bubble.cx = preferredBubbleCx(
      bounds,
      bubble.characterId,
      bubble.halfW,
      bubble.tailX,
      zones.sidePad,
    );
    // Seed near the character — final pack is bottom-up.
    const maxCy = maxBubbleCy(bubble, zones);
    const minCy = minBubbleCy(bubble, zones, allowBubbleEscape, obstacles);
    bubble.cy = Math.min(maxCy, Math.max(minCy, bubble.tailY - bubble.halfH - BUBBLE_ABOVE_CHARACTER_GAP));
  }

  const characterIds = [...new Set(bubbles.map((bubble) => bubble.characterId))];

  const bubbleNodes: ForceNode[] = bubbles.map((bubble, index) => ({
    id: `bubble-${index}`,
    kind: 'bubble' as const,
    x: bubble.cx,
    y: bubble.cy,
    targetX: bubble.cx,
    targetY: bubble.cy,
    r: collideRadius(bubble.halfW, bubble.halfH),
    bubbleIndex: index,
  }));

  const markerNodes: ForceNode[] = characterIds.map((characterId) => {
    const anchor = characterTailAnchor(bounds, characterId);
    return {
      id: `marker-${characterId}`,
      kind: 'marker' as const,
      x: anchor.x,
      y: anchor.y,
      fx: anchor.x,
      fy: anchor.y,
      targetX: anchor.x,
      targetY: anchor.y,
      r: markerRadius(bounds, characterId),
    };
  });

  const obstacleNodes: ForceNode[] = obstacles.map((obstacle, index) => ({
    id: `obstacle-${index}`,
    kind: 'obstacle' as const,
    x: obstacle.cx,
    y: obstacle.cy,
    fx: obstacle.cx,
    fy: obstacle.cy,
    targetX: obstacle.cx,
    targetY: obstacle.cy,
    r: collideRadius(obstacle.halfW, obstacle.halfH),
  }));

  const nodes: ForceNode[] = [...bubbleNodes, ...markerNodes, ...obstacleNodes];

  const links: ForceLink[] = bubbles.map((bubble, index) => {
    const marker = markerNodes.find((node) => node.id === `marker-${bubble.characterId}`)!;
    return {
      source: bubbleNodes[index]!,
      target: marker,
      distance: bubble.halfH + BUBBLE_ABOVE_CHARACTER_GAP + 10,
    };
  });

  const simulation = forceSimulation<ForceNode>(nodes)
    .force(
      'collide',
      forceCollide<ForceNode>()
        .radius((node) => node.r)
        .strength(1)
        .iterations(3),
    )
    .force(
      'x',
      forceX<ForceNode>()
        .x((node) => node.targetX)
        .strength((node) => (node.kind === 'bubble' ? 0.1 : 0)),
    )
    .force(
      'y',
      forceY<ForceNode>()
        .y((node) => node.targetY)
        .strength((node) => (node.kind === 'bubble' ? 0.14 : 0)),
    )
    .force(
      'link',
      forceLink<ForceNode, ForceLink>(links)
        .id((node) => node.id)
        .distance((link) => link.distance)
        .strength(0.06),
    )
    .stop();

  for (let i = 0; i < ticks; i++) {
    simulation.tick();
  }

  for (const node of bubbleNodes) {
    const index = node.bubbleIndex;
    if (index == null) continue;
    const bubble = bubbles[index];
    if (!bubble) continue;
    bubble.cx = node.x ?? bubble.cx;
    bubble.cy = node.y ?? bubble.cy;
  }

  postClampBubbles(bubbles, zones, allowBubbleEscape, obstacles);
  enforceTailClearance(bubbles);
}

/** Absolute last line of defense for character_below_bubble invariant. */
function enforceTailClearance(bubbles: SpeechBubbleLayout[]): void {
  for (const bubble of bubbles) {
    const maxBottom = bubble.tailY - 4;
    if (bubble.cy + bubble.halfH > maxBottom) {
      bubble.cy = maxBottom - bubble.halfH;
    }
  }
}

/**
 * Bottom-up reading-order pack: anchor near characters, stack earlier bubbles above.
 * Avoids crushing everyone onto the same maxY (the multi-bubble overlap failure mode).
 */
export function postClampBubbles(
  bubbles: SpeechBubbleLayout[],
  zones: PanelTextZones,
  allowEscape = false,
  obstacles: ForceObstacle[] = [],
): void {
  for (const bubble of bubbles) {
    if (!allowEscape) {
      bubble.cx = clampX(bubble.cx, bubble.halfW, zones.bounds, zones.sidePad);
    }
  }

  // Horizontal separation for different speakers when width allows.
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i]!;
      const b = bubbles[j]!;
      if (a.characterId === b.characterId) continue;
      if (!boxesOverlap(a, b) && !horizontalOverlap(a, b)) continue;
      const availableW = zones.bounds.w - zones.sidePad * 2;
      const needW = a.halfW + b.halfW + OVERLAP_MARGIN;
      if (needW > availableW * 0.92) continue;
      const gap = a.halfW + b.halfW + OVERLAP_MARGIN - Math.abs(a.cx - b.cx);
      if (gap <= 0) continue;
      const dir = a.cx <= b.cx ? -1 : 1;
      a.cx += dir * (gap / 2 + 0.5);
      b.cx -= dir * (gap / 2 + 0.5);
      if (!allowEscape) {
        a.cx = clampX(a.cx, a.halfW, zones.bounds, zones.sidePad);
        b.cx = clampX(b.cx, b.halfW, zones.bounds, zones.sidePad);
      }
    }
  }

  packBubblesBottomUp(bubbles, zones, allowEscape, obstacles);
}

function packBubblesBottomUp(
  bubbles: SpeechBubbleLayout[],
  zones: PanelTextZones,
  allowEscape: boolean,
  obstacles: ForceObstacle[],
): void {
  // Place from last → first so later lines sit closer to characters (short tails).
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i]!;
    const maxCy = maxBubbleCy(bubble, zones);
    const minCy = minBubbleCy(bubble, zones, allowEscape, obstacles);

    let bottomLimit = maxCy + bubble.halfH;
    for (let j = i + 1; j < bubbles.length; j++) {
      const later = bubbles[j]!;
      if (horizontalOverlap(bubble, later)) {
        bottomLimit = Math.min(bottomLimit, later.cy - later.halfH - OVERLAP_MARGIN);
      }
    }

    const ideal = bubble.tailY - bubble.halfH - BUBBLE_ABOVE_CHARACTER_GAP;
    let cy = Math.min(maxCy, bottomLimit - bubble.halfH, Math.max(minCy, ideal));

    if (cy < minCy) cy = minCy;
    if (cy > maxCy) cy = maxCy;
    for (let j = i + 1; j < bubbles.length; j++) {
      const later = bubbles[j]!;
      if (!horizontalOverlap(bubble, later)) continue;
      const maxClearCy = later.cy - later.halfH - OVERLAP_MARGIN - bubble.halfH;
      cy = Math.min(cy, maxClearCy);
    }
    if (minCy > maxCy) {
      bubble.cy = maxCy;
    } else {
      bubble.cy = Math.max(minCy, Math.min(maxCy, cy));
    }
  }

  enforceTailClearance(bubbles);

  // Forward pass: if any earlier/later pair still overlaps, push the later one down or earlier up.
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const earlier = bubbles[i]!;
      const later = bubbles[j]!;
      if (!boxesOverlap(earlier, later)) continue;

      const neededLater = earlier.cy + earlier.halfH + OVERLAP_MARGIN + later.halfH;
      const laterMax = maxBubbleCy(later, zones);
      if (neededLater <= laterMax + 0.5) {
        later.cy = neededLater;
        continue;
      }

      const shift = neededLater - laterMax;
      earlier.cy = Math.max(
        Math.min(minBubbleCy(earlier, zones, allowEscape, obstacles), laterMax),
        earlier.cy - shift,
      );
      later.cy = laterMax;

      if (boxesOverlap(earlier, later) && earlier.characterId !== later.characterId) {
        const dir = earlier.cx <= later.cx ? -1 : 1;
        const need =
          earlier.halfW + later.halfW + OVERLAP_MARGIN - Math.abs(earlier.cx - later.cx);
        if (need > 0) {
          earlier.cx += dir * (need / 2 + 0.5);
          later.cx -= dir * (need / 2 + 0.5);
          if (!allowEscape) {
            earlier.cx = clampX(earlier.cx, earlier.halfW, zones.bounds, zones.sidePad);
            later.cx = clampX(later.cx, later.halfW, zones.bounds, zones.sidePad);
          }
        }
      }
    }
  }

  enforceTailClearance(bubbles);
}
