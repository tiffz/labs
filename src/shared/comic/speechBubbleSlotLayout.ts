/**
 * Discrete speech-bubble slot placer — column bias + vertical stack with shrink-to-fit.
 * Prefer conflict-free placements; shrink font (and half-width) until hard rules hold.
 */

import { characterMarkerLayoutBox, characterTailAnchor } from './characterMarkers';
import { activeMarkerPlacement } from './markerPlacementScope';
import { bubbleTextBBox } from './panelTextLayoutInvariants';
import { clampX, maxBubbleHalfWidth, panelTextZones, type PanelTextZones } from './panelTextZones';
import { sfxLayoutBBox } from './sfxLoudness';
import {
  BUBBLE_MIN_READABLE_FONT,
  fitDialogueLines,
  fitDialogueLinesWithinHalfH,
  isDialogueDisplayTruncated,
  pickBubbleShape,
} from './speechBubblePath';
import { bubblesTailsOverlap } from './speechBubbleTailOverlap';
import type { LayoutBounds, PanelTextLayoutItem, SpeechBubbleLayout } from './speechBubbleLayout';
import type { PanelCharacterId, PanelTextBlock } from './types';

const ABOVE_GAP = 8;
const STACK_GAP = 6;
const CAPTION_GAP = 6;
const EPS = 1.5;
const OBSTACLE_MARGIN = 4;
/** Bubble escape may overhang sideways; vertical escape into the next strip is capped. */
const VERTICAL_ESCAPE_SLOP = 6;
const MIN_CAPTION_BAND = 26;
const MIN_DIALOGUE_BAND = 36;
/** Below this width, comic lettering cannot read — drop all text chrome. */
export const MIN_PANEL_TEXT_WIDTH = 72;
/** Dialogue balloons need a bit more than captions. */
export const MIN_PANEL_DIALOGUE_WIDTH = 96;
/** Captions need room for a short phrase without sideways escape soup. */
export const MIN_PANEL_CAPTION_WIDTH = 88;

const CHARACTER_CX_RATIO: Record<PanelCharacterId, number> = {
  a: 0.28,
  b: 0.72,
  c: 0.5,
};

function slotCxRatio(characterId: PanelCharacterId): number {
  return activeMarkerPlacement()?.[characterId]?.x ?? CHARACTER_CX_RATIO[characterId];
}

type WorkingBubble = {
  itemIndex: number;
  characterId: PanelCharacterId;
  content: string;
  layout: SpeechBubbleLayout;
};

/** Fixed caption/SFX box a bubble must not land on top of. */
type SlotObstacle = { left: number; top: number; right: number; bottom: number };

function reservedTopFromItems(
  items: PanelTextLayoutItem[],
  zones: PanelTextZones,
  allowEscape: boolean,
): number {
  let top = allowEscape ? zones.bounds.y + 2 : zones.dialogueTop;
  for (const item of items) {
    // Only chrome above the first bubble reserves space (trailing captions/SFX are rare).
    if (item.kind === 'bubble') break;
    if (item.kind === 'caption') {
      top = Math.max(top, item.layout.y + item.layout.height + CAPTION_GAP);
    } else if (item.kind === 'sfx') {
      top = Math.max(top, sfxLayoutBBox(item.layout).bottom + CAPTION_GAP);
    }
  }
  return top;
}

/** Captions AND SFX are first-class obstacles bubbles must dodge during placement. */
function obstacleBoxesFromItems(items: PanelTextLayoutItem[]): SlotObstacle[] {
  const boxes: SlotObstacle[] = [];
  for (const item of items) {
    if (item.kind === 'caption') {
      boxes.push({
        left: item.layout.x,
        top: item.layout.y,
        right: item.layout.x + item.layout.width,
        bottom: item.layout.y + item.layout.height,
      });
    } else if (item.kind === 'sfx') {
      boxes.push(sfxLayoutBBox(item.layout));
    }
  }
  return boxes;
}

function bubbleBoxFromCandidate(candidate: SpeechBubbleLayout): SlotObstacle {
  return {
    left: candidate.cx - candidate.halfW,
    top: candidate.cy - candidate.halfH,
    right: candidate.cx + candidate.halfW,
    bottom: candidate.cy + candidate.halfH,
  };
}

function boxOverlapsObstacle(box: SlotObstacle, obstacle: SlotObstacle, margin = OBSTACLE_MARGIN): boolean {
  return !(
    box.right + margin <= obstacle.left ||
    obstacle.right + margin <= box.left ||
    box.bottom + margin <= obstacle.top ||
    obstacle.bottom + margin <= box.top
  );
}

function findOverlappingObstacle(
  candidate: SpeechBubbleLayout,
  obstacles: SlotObstacle[],
): SlotObstacle | null {
  const box = bubbleBoxFromCandidate(candidate);
  for (const obstacle of obstacles) {
    if (boxOverlapsObstacle(box, obstacle)) return obstacle;
  }
  return null;
}

function maxCyForBubble(
  bounds: LayoutBounds,
  zones: PanelTextZones,
  characterId: PanelCharacterId,
  halfH: number,
  tipY: number,
): number {
  const marker = characterMarkerLayoutBox(bounds, characterId);
  return Math.min(
    zones.dialogueBottom - halfH,
    tipY - ABOVE_GAP - halfH,
    marker.top - halfH - 4,
  );
}

function fitBubble(
  content: string,
  fontSize: number,
  maxHalfW: number,
  maxHalfH: number,
  innerWidth: number,
  bounds: LayoutBounds,
  zones: PanelTextZones,
): SpeechBubbleLayout['metrics'] & { lines: string[] } {
  const zoneHeight = Math.max(24, zones.dialogueBottom - zones.dialogueTop);
  const shape = pickBubbleShape(bounds.h, zoneHeight, maxHalfH);
  let fitted = fitDialogueLines(content, maxHalfW, innerWidth, fontSize, 8, shape);
  if (fitted.metrics.halfH > maxHalfH + 0.5) {
    fitted = fitDialogueLinesWithinHalfH(
      content,
      maxHalfW,
      maxHalfH,
      innerWidth,
      Math.max(BUBBLE_MIN_READABLE_FONT, fontSize - 1),
      shape,
    );
  }
  return { ...fitted.metrics, lines: fitted.lines };
}

function bodiesOverlap(a: SpeechBubbleLayout, b: SpeechBubbleLayout, margin = 4): boolean {
  return !(
    a.cx + a.halfW + margin < b.cx - b.halfW ||
    b.cx + b.halfW + margin < a.cx - a.halfW ||
    a.cy + a.halfH + margin < b.cy - b.halfH ||
    b.cy + b.halfH + margin < a.cy - a.halfH
  );
}

function textInsidePanel(bubble: SpeechBubbleLayout, bounds: LayoutBounds): boolean {
  const box = bubbleTextBBox(bubble);
  return (
    box.left >= bounds.x - EPS &&
    box.right <= bounds.x + bounds.w + EPS &&
    box.top >= bounds.y - EPS &&
    box.bottom <= bounds.y + bounds.h + EPS
  );
}

function clampTextIntoPanel(bubble: SpeechBubbleLayout, bounds: LayoutBounds): void {
  const box = bubbleTextBBox(bubble);
  const textHalf = Math.max(1, (box.right - box.left) / 2);
  const minCx = bounds.x + textHalf;
  const maxCx = bounds.x + bounds.w - textHalf;
  if (minCx <= maxCx) {
    bubble.cx = Math.min(maxCx, Math.max(minCx, bubble.cx));
  } else {
    bubble.cx = bounds.x + bounds.w / 2;
  }
  // Vertical: keep text inside while preserving tail clearance when possible.
  const after = bubbleTextBBox(bubble);
  if (after.top < bounds.y - EPS) {
    bubble.cy += bounds.y - after.top;
  }
  const afterY = bubbleTextBBox(bubble);
  if (afterY.bottom > bounds.y + bounds.h + EPS) {
    bubble.cy -= afterY.bottom - (bounds.y + bounds.h);
  }
}

function columnCx(
  bounds: LayoutBounds,
  characterId: PanelCharacterId,
  halfW: number,
  zones: PanelTextZones,
  allowEscape: boolean,
  fanIndex: number,
  fanCount: number,
): number {
  const ratio = slotCxRatio(characterId);
  const fan = fanCount <= 1 ? 0 : (fanIndex - (fanCount - 1) / 2) * Math.min(bounds.w * 0.1, halfW * 0.6);
  const raw = bounds.x + bounds.w * ratio + fan;
  if (allowEscape) {
    // Keep centers near-panel so dialogue text can clamp into bounds.
    const min = bounds.x + Math.min(halfW, bounds.w * 0.35);
    const max = bounds.x + bounds.w - Math.min(halfW, bounds.w * 0.35);
    return Math.min(max, Math.max(min, raw));
  }
  return clampX(raw, halfW, bounds, zones.sidePad);
}

function maxBodyBottom(bounds: LayoutBounds, allowEscape: boolean): number {
  return bounds.y + bounds.h + (allowEscape ? VERTICAL_ESCAPE_SLOP : 0);
}

function minBodyTop(bounds: LayoutBounds, allowEscape: boolean): number {
  return bounds.y - (allowEscape ? VERTICAL_ESCAPE_SLOP : 0);
}

/** Keep body from spilling into the previous/next strip; sideways escape stays allowed. */
function clampBubbleVerticalEscape(
  bubble: SpeechBubbleLayout,
  bounds: LayoutBounds,
  allowEscape: boolean,
): void {
  const maxBottom = maxBodyBottom(bounds, allowEscape);
  const minTop = minBodyTop(bounds, allowEscape);
  if (bubble.cy + bubble.halfH > maxBottom) {
    bubble.cy = maxBottom - bubble.halfH;
  }
  if (bubble.cy - bubble.halfH < minTop) {
    bubble.cy = minTop + bubble.halfH;
  }
}

function hardConflicts(
  bubbles: SpeechBubbleLayout[],
  bounds: LayoutBounds,
  allowEscape: boolean,
  obstacles: SlotObstacle[] = [],
): boolean {
  for (let i = 0; i < bubbles.length; i++) {
    const a = bubbles[i]!;
    if (a.cy + a.halfH > a.tailY - 4) return true;
    // Aesthetic: reject spaghetti tails that span most of a tall panel.
    if (a.tailY - (a.cy + a.halfH) > bounds.h * 0.38) return true;
    if (a.cy + a.halfH > maxBodyBottom(bounds, allowEscape) + EPS) return true;
    if (a.cy - a.halfH < minBodyTop(bounds, allowEscape) - EPS) return true;
    if (allowEscape && !textInsidePanel(a, bounds)) return true;
    if (findOverlappingObstacle(a, obstacles)) return true;
    for (let j = i + 1; j < bubbles.length; j++) {
      const b = bubbles[j]!;
      if (bodiesOverlap(a, b)) return true;
      if (a.characterId !== b.characterId && bubblesTailsOverlap(a, b)) return true;
      // Reading order only when boxes interact (side-by-side same band is OK).
      if (bodiesOverlap(a, b, 0) && a.cy + a.halfH > b.cy - b.halfH + EPS) return true;
    }
  }
  return false;
}

function columnsConflict(a: SpeechBubbleLayout, b: SpeechBubbleLayout): boolean {
  const gap = Math.abs(a.cx - b.cx);
  return gap < a.halfW + b.halfW + STACK_GAP;
}

type FittedSeed = WorkingBubble & {
  metrics: SpeechBubbleLayout['metrics'] & { lines: string[] };
  anchor: { x: number; y: number };
  maxCy: number;
};

function fitWorkingBubbles(
  working: WorkingBubble[],
  bounds: LayoutBounds,
  zones: PanelTextZones,
  fontSize: number,
  reservedTop: number,
  maxHalfWScale: number,
): FittedSeed[] | null {
  const n = working.length;
  const innerWidth = bounds.w - zones.sidePad * 2;
  const bandBottom = zones.dialogueBottom;
  const bandH = Math.max(12, bandBottom - reservedTop);
  // Near-speaker packing needs modest heights; width stays generous so lines don’t truncate.
  // Cap half-height so we fail over to fewer bubbles instead of micro-ellipses.
  const maxHalfH = Math.max(
    12,
    Math.min(bandH * 0.2, 34, (bandH - (n - 1) * STACK_GAP) / (2 * Math.max(1, n - 0.35))),
  );
  const maxHalfW = Math.min(
    maxBubbleHalfWidth(bounds, zones.sidePad) * maxHalfWScale,
    bounds.w * (n >= 3 ? 0.24 : n === 2 ? 0.34 : 0.42),
  );

  const fitted: FittedSeed[] = [];
  for (let i = 0; i < n; i++) {
    const seed = working[i]!;
    let metrics = fitBubble(
      seed.content,
      fontSize,
      maxHalfW,
      maxHalfH,
      innerWidth,
      bounds,
      zones,
    );
    let widthTries = 0;
    while (widthTries < 6) {
      const probe: SpeechBubbleLayout = {
        ...seed.layout,
        cx: bounds.x + bounds.w / 2,
        cy: reservedTop + metrics.halfH,
        halfW: metrics.halfW,
        halfH: metrics.halfH,
        lines: metrics.lines,
        metrics: {
          halfW: metrics.halfW,
          halfH: metrics.halfH,
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          padX: metrics.padX,
          padY: metrics.padY,
          shape: metrics.shape,
        },
        characterId: seed.characterId,
        tailX: seed.layout.tailX,
        tailY: seed.layout.tailY,
      };
      const box = bubbleTextBBox(probe);
      if (box.right - box.left <= bounds.w - 2) break;
      metrics = fitBubble(
        seed.content,
        fontSize,
        Math.max(14, metrics.halfW * 0.82),
        maxHalfH,
        innerWidth,
        bounds,
        zones,
      );
      widthTries++;
    }
    const anchor = characterTailAnchor(bounds, seed.characterId);
    const maxCy = maxCyForBubble(bounds, zones, seed.characterId, metrics.halfH, anchor.y);
    if (maxCy < reservedTop + metrics.halfH) return null;
    fitted.push({ ...seed, metrics, anchor, maxCy });
  }
  return fitted;
}

function buildCandidate(
  seed: FittedSeed,
  cx: number,
  cy: number,
): SpeechBubbleLayout {
  const { metrics, anchor } = seed;
  return {
    ...seed.layout,
    cx,
    cy,
    halfW: metrics.halfW,
    halfH: metrics.halfH,
    tailX: anchor.x,
    tailY: anchor.y,
    lines: metrics.lines,
    sourceContent: seed.content,
    truncated: isDialogueDisplayTruncated(seed.content, metrics.lines),
    metrics: {
      halfW: metrics.halfW,
      halfH: metrics.halfH,
      fontSize: metrics.fontSize,
      lineHeight: metrics.lineHeight,
      padX: metrics.padX,
      padY: metrics.padY,
      shape: metrics.shape,
    },
    characterId: seed.characterId,
  };
}

/**
 * Near-speaker comic packing: each bubble hugs its marker; different speakers
 * sit side-by-side. Stack only when lanes collide (keeps tails short).
 */
function tryStack(
  working: WorkingBubble[],
  bounds: LayoutBounds,
  zones: PanelTextZones,
  allowEscape: boolean,
  fontSize: number,
  reservedTop: number,
  maxHalfWScale: number,
  obstacles: SlotObstacle[],
): SpeechBubbleLayout[] | null {
  const fitted = fitWorkingBubbles(
    working,
    bounds,
    zones,
    fontSize,
    reservedTop,
    maxHalfWScale,
  );
  if (!fitted) return null;
  const n = fitted.length;
  const placed: SpeechBubbleLayout[] = [];
  const maxTail = bounds.h * 0.38;

  for (let i = 0; i < n; i++) {
    const seed = fitted[i]!;
    const minCy = reservedTop + seed.metrics.halfH;
    const tipFloor = seed.maxCy;
    if (tipFloor < minCy - 0.5) return null;

    let cx = columnCx(bounds, seed.characterId, seed.metrics.halfW, zones, allowEscape, i, n);
    let cy = tipFloor;

    // If an earlier bubble shares this lane, sit just below it (reading order).
    for (const prev of placed) {
      const probe = buildCandidate(seed, cx, tipFloor);
      if (seed.characterId === prev.characterId || columnsConflict(probe, prev)) {
        const below = prev.cy + prev.halfH + STACK_GAP + seed.metrics.halfH;
        if (below <= tipFloor) cy = Math.max(cy, below);
      }
    }

    let candidate = buildCandidate(seed, cx, Math.min(tipFloor, Math.max(minCy, cy)));
    let resolved = false;

    for (let attempt = 0; attempt < 14; attempt++) {
      clampTextIntoPanel(candidate, bounds);
      clampBubbleVerticalEscape(candidate, bounds, allowEscape);
      candidate.cy = Math.min(tipFloor, Math.max(minCy, candidate.cy));
      if (candidate.tailY - (candidate.cy + candidate.halfH) > maxTail) {
        candidate.cy = Math.min(
          tipFloor,
          Math.max(minCy, candidate.tailY - maxTail - candidate.halfH),
        );
      }

      let conflict: 'body' | 'tail' | 'obstacle' | null = null;
      let conflictPrev: SpeechBubbleLayout | null = null;
      let conflictObstacle: SlotObstacle | null = null;
      for (const prev of placed) {
        if (bodiesOverlap(candidate, prev)) {
          conflict = 'body';
          conflictPrev = prev;
          break;
        }
        if (
          candidate.characterId !== prev.characterId &&
          bubblesTailsOverlap(candidate, prev)
        ) {
          conflict = 'tail';
          conflictPrev = prev;
          break;
        }
      }
      if (!conflict) {
        conflictObstacle = findOverlappingObstacle(candidate, obstacles);
        if (conflictObstacle) conflict = 'obstacle';
      }

      const tailOk =
        candidate.cy + candidate.halfH <= candidate.tailY - 4 &&
        candidate.tailY - (candidate.cy + candidate.halfH) <= maxTail + 1;
      const textOk = !allowEscape || textInsidePanel(candidate, bounds);

      if (!conflict && tailOk && textOk) {
        resolved = true;
        break;
      }

      if (conflict === 'body' && conflictPrev) {
        const needCy = conflictPrev.cy + conflictPrev.halfH + STACK_GAP + candidate.halfH;
        if (needCy <= tipFloor) {
          candidate = { ...candidate, cy: needCy };
          continue;
        }
        // Lift the earlier bubble to make room near the tip.
        const lift = needCy - tipFloor;
        conflictPrev.cy = Math.max(
          reservedTop + conflictPrev.halfH,
          conflictPrev.cy - lift,
        );
        candidate = { ...candidate, cy: tipFloor };
        continue;
      }

      if (conflict === 'obstacle' && conflictObstacle) {
        const belowObstacle = conflictObstacle.bottom + STACK_GAP + candidate.halfH;
        if (belowObstacle <= tipFloor) {
          candidate = { ...candidate, cy: belowObstacle };
          continue;
        }
        const aboveObstacle = conflictObstacle.top - STACK_GAP - candidate.halfH;
        if (aboveObstacle >= minCy) {
          candidate = { ...candidate, cy: aboveObstacle };
          continue;
        }
        // No vertical room either side — fall through to fan sideways below.
      }

      // Fan sideways, then nudge slightly upward.
      cx = columnCx(
        bounds,
        seed.characterId,
        candidate.halfW,
        zones,
        allowEscape,
        i + (attempt % 2 === 0 ? 1 : -1) * (attempt + 1),
        n + 4,
      );
      const nudgeUp = attempt >= 5 ? (attempt - 4) * (candidate.halfH * 0.3 + STACK_GAP) : 0;
      candidate = buildCandidate(seed, cx, Math.max(minCy, tipFloor - nudgeUp));
    }

    if (!resolved) return null;
    clampTextIntoPanel(candidate, bounds);
    clampBubbleVerticalEscape(candidate, bounds, allowEscape);
    candidate.cy = Math.min(tipFloor, Math.max(minCy, candidate.cy));
    if (allowEscape && !textInsidePanel(candidate, bounds)) return null;
    if (candidate.cy + candidate.halfH > candidate.tailY - 4) return null;
    if (candidate.tailY - (candidate.cy + candidate.halfH) > maxTail + 1) return null;
    if (candidate.cy + candidate.halfH > maxBodyBottom(bounds, allowEscape) + EPS) return null;
    if (findOverlappingObstacle(candidate, obstacles)) return null;
    for (const prev of placed) {
      if (bodiesOverlap(candidate, prev)) return null;
      if (
        candidate.characterId !== prev.characterId &&
        bubblesTailsOverlap(candidate, prev)
      ) {
        return null;
      }
    }
    placed.push(candidate);
  }

  if (hardConflicts(placed, bounds, allowEscape, obstacles)) return null;
  return placed;
}

function collectWorkingBubbles(
  items: PanelTextLayoutItem[],
  blocks: PanelTextBlock[],
): WorkingBubble[] {
  const working: WorkingBubble[] = [];
  let blockCursor = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.kind !== 'bubble') continue;
    while (blockCursor < blocks.length && blocks[blockCursor]!.kind !== 'dialogue') {
      blockCursor++;
    }
    const block = blocks[blockCursor];
    const content =
      block && block.kind === 'dialogue' ? block.content : item.layout.lines.join(' ');
    if (block && block.kind === 'dialogue') blockCursor++;
    working.push({
      itemIndex: i,
      characterId: item.layout.characterId,
      content,
      layout: item.layout,
    });
  }
  return working;
}

function tryPlaceWorking(
  working: WorkingBubble[],
  bounds: LayoutBounds,
  zones: PanelTextZones,
  allowEscape: boolean,
  reservedTop: number,
  obstacles: SlotObstacle[],
): { active: WorkingBubble[]; placed: SpeechBubbleLayout[] } | null {
  let active = working;
  while (active.length > 0) {
    const fontFloor = active.length === 1 ? 5 : BUBBLE_MIN_READABLE_FONT;
    for (const scale of [1, 0.88, 0.75, 0.62]) {
      for (let font = 13; font >= fontFloor; font--) {
        const placed = tryStack(
          active,
          bounds,
          zones,
          allowEscape,
          font,
          reservedTop,
          scale,
          obstacles,
        );
        if (placed && placed.every((bubble) => bubble.metrics.fontSize >= fontFloor)) {
          return { active, placed };
        }
      }
    }
    active = active.slice(0, -1);
  }
  return null;
}

/** Prefer dialogue: drop captions/SFX that still intersect a bubble body. */
function dropObstaclesOverlappingBubbles(items: PanelTextLayoutItem[]): void {
  for (let pass = 0; pass < 4; pass++) {
    let removed = false;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]!;
      if (item.kind !== 'caption' && item.kind !== 'sfx') continue;
      const obstacle =
        item.kind === 'caption'
          ? {
              left: item.layout.x,
              top: item.layout.y,
              right: item.layout.x + item.layout.width,
              bottom: item.layout.y + item.layout.height,
            }
          : sfxLayoutBBox(item.layout);
      const hitsBubble = items.some(
        (other) =>
          other.kind === 'bubble' && boxOverlapsObstacle(bubbleBoxFromCandidate(other.layout), obstacle),
      );
      if (!hitsBubble) continue;
      items.splice(i, 1);
      removed = true;
    }
    if (!removed) break;
  }
}

/** Last-resort: drop bubbles that still sit on remaining chrome. */
function removeOverlappingBubbles(items: PanelTextLayoutItem[]): void {
  const obstacles = obstacleBoxesFromItems(items);
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind !== 'bubble') continue;
    if (findOverlappingObstacle(item.layout, obstacles)) {
      items.splice(i, 1);
    }
  }
}

/**
 * Place bubbles with column bias + vertical stack. Always writes a placement;
 * prefers conflict-free stacks. If captions make the band infeasible, drop them and
 * retry — never leave seed positions that overlap captions.
 */
export function placeItemsWithSlots(
  items: PanelTextLayoutItem[],
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  allowEscape: boolean,
): void {
  const zones = panelTextZones(bounds);
  const working = collectWorkingBubbles(items, blocks);
  if (working.length === 0) return;

  const attempt = (dropCaptions: boolean) => {
    if (dropCaptions) {
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i]!.kind === 'caption') items.splice(i, 1);
      }
    }
    // Re-index working against the (possibly mutated) items list.
    const nextWorking = collectWorkingBubbles(items, blocks);
    const reservedTop = reservedTopFromItems(items, zones, allowEscape);
    const obstacles = obstacleBoxesFromItems(items);
    return tryPlaceWorking(nextWorking, bounds, zones, allowEscape, reservedTop, obstacles);
  };

  let result = attempt(false);
  if (!result && items.some((item) => item.kind === 'caption')) {
    result = attempt(true);
  }

  if (!result) {
    // Never leave seed bubbles painted over captions — drop chrome first, then bubbles.
    dropObstaclesOverlappingBubbles(items);
    removeOverlappingBubbles(items);
    return;
  }

  const { active, placed: best } = result;
  const keepIndexes = new Set(active.map((row) => row.itemIndex));
  for (let i = 0; i < active.length; i++) {
    const item = items[active[i]!.itemIndex]!;
    if (item.kind !== 'bubble') continue;
    Object.assign(item.layout, best[i]!);
    clampBubbleVerticalEscape(item.layout, bounds, allowEscape);
  }
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind === 'bubble' && !keepIndexes.has(i)) {
      items.splice(i, 1);
    }
  }
  dropObstaclesOverlappingBubbles(items);
  removeOverlappingBubbles(items);
}

/** Estimate how many active dialogue lines a panel can host at readable font. */
export function maxDialogueBlocksForPanel(bounds: LayoutBounds): number {
  if (bounds.w < MIN_PANEL_DIALOGUE_WIDTH) return 0;
  const zones = panelTextZones(bounds);
  const band = Math.max(0, zones.dialogueBottom - zones.dialogueTop);
  const perBlock = Math.max(32, BUBBLE_MIN_READABLE_FONT * 2.8 + ABOVE_GAP);
  const byHeight = Math.max(1, Math.floor(band / perBlock));
  // Narrow panels cannot fan multi-speaker tails at a readable size.
  const byWidth = bounds.w < 120 ? 1 : bounds.w < 155 ? 2 : 3;
  return Math.min(byHeight, byWidth);
}

/**
 * Merge consecutive same-speaker lines and trim to what the panel can host.
 * Captions are emitted before dialogue (placement-stable reading stack).
 */
export function adaptBlocksToPanelBudget(
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
): PanelTextBlock[] {
  // Ultra-narrow strips (e.g. 8-across) cannot host lettering — empty is better than "…" legs.
  if (bounds.w < MIN_PANEL_TEXT_WIDTH || bounds.h < 48) return [];

  const captions: PanelTextBlock[] = [];
  const dialogue: PanelTextBlock[] = [];
  const sfx: PanelTextBlock[] = [];

  for (const block of blocks) {
    if (!block.content.trim()) continue;
    if (block.kind === 'caption') {
      captions.push({ ...block });
      continue;
    }
    if (block.kind === 'sfx') {
      if (sfx.length === 0) sfx.push({ ...block });
      continue;
    }
    const prev = dialogue[dialogue.length - 1];
    if (prev && prev.kind === 'dialogue' && prev.characterId === block.characterId) {
      prev.content = `${prev.content.trim()} ${block.content.trim()}`;
    } else {
      dialogue.push({ ...block });
    }
  }

  const maxDialogue = maxDialogueBlocksForPanel(bounds);
  const keptDialogue = dialogue.slice(0, maxDialogue);
  const zones = panelTextZones(bounds);
  const band = Math.max(0, zones.dialogueBottom - zones.dialogueTop);
  const canHostCaption =
    bounds.w >= MIN_PANEL_CAPTION_WIDTH &&
    band >= MIN_CAPTION_BAND &&
    (keptDialogue.length === 0
      ? band >= MIN_CAPTION_BAND
      : band >= MIN_CAPTION_BAND + MIN_DIALOGUE_BAND &&
        band >= MIN_CAPTION_BAND + keptDialogue.length * 28);
  const keptCaptions = canHostCaption
    ? captions.slice(0, keptDialogue.length <= 1 ? 1 : Math.min(1, captions.length))
    : [];
  const canHostSfx = bounds.w >= MIN_PANEL_DIALOGUE_WIDTH && bounds.h >= 80;
  const keptSfx =
    canHostSfx && !(keptDialogue.length >= maxDialogue && maxDialogue <= 1) ? sfx : [];
  return [...keptCaptions, ...keptDialogue, ...keptSfx];
}
