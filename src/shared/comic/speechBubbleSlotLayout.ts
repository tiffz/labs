/**
 * Discrete speech-bubble slot placer — column bias + vertical stack with shrink-to-fit.
 * Prefer conflict-free placements; shrink font (and half-width) until hard rules hold.
 */

import { characterMarkerLayoutBox, characterTailAnchor } from './characterMarkers';
import { bubbleTextBBox } from './panelTextLayoutInvariants';
import { clampX, maxBubbleHalfWidth, panelTextZones, type PanelTextZones } from './panelTextZones';
import {
  BUBBLE_MIN_READABLE_FONT,
  fitDialogueLines,
  fitDialogueLinesWithinHalfH,
  pickBubbleShape,
} from './speechBubblePath';
import { bubblesTailsOverlap } from './speechBubbleTailOverlap';
import type { LayoutBounds, PanelTextLayoutItem, SpeechBubbleLayout } from './speechBubbleLayout';
import type { PanelCharacterId, PanelTextBlock } from './types';

const ABOVE_GAP = 8;
const STACK_GAP = 6;
const CAPTION_GAP = 6;
const EPS = 1.5;

const CHARACTER_CX_RATIO: Record<PanelCharacterId, number> = {
  a: 0.28,
  b: 0.72,
  c: 0.5,
};

type WorkingBubble = {
  itemIndex: number;
  characterId: PanelCharacterId;
  content: string;
  layout: SpeechBubbleLayout;
};

function reservedTopFromItems(
  items: PanelTextLayoutItem[],
  zones: PanelTextZones,
  allowEscape: boolean,
): number {
  let top = allowEscape ? zones.bounds.y + 2 : zones.dialogueTop;
  for (const item of items) {
    // Only captions above the first bubble reserve space (trailing captions are rare).
    if (item.kind === 'bubble') break;
    if (item.kind === 'caption') {
      top = Math.max(top, item.layout.y + item.layout.height + CAPTION_GAP);
    }
  }
  return top;
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
  let fitted = fitDialogueLines(content, maxHalfW, innerWidth, fontSize, 4, shape);
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
  const ratio = CHARACTER_CX_RATIO[characterId];
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

function hardConflicts(
  bubbles: SpeechBubbleLayout[],
  bounds: LayoutBounds,
  allowEscape: boolean,
): boolean {
  for (let i = 0; i < bubbles.length; i++) {
    const a = bubbles[i]!;
    if (a.cy + a.halfH > a.tailY - 4) return true;
    // Aesthetic: reject spaghetti tails that span most of a tall panel.
    if (a.tailY - (a.cy + a.halfH) > bounds.h * 0.38) return true;
    if (allowEscape && !textInsidePanel(a, bounds)) return true;
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
      candidate.cy = Math.min(tipFloor, Math.max(minCy, candidate.cy));
      if (candidate.tailY - (candidate.cy + candidate.halfH) > maxTail) {
        candidate.cy = Math.min(
          tipFloor,
          Math.max(minCy, candidate.tailY - maxTail - candidate.halfH),
        );
      }

      let conflict: 'body' | 'tail' | null = null;
      let conflictPrev: SpeechBubbleLayout | null = null;
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
    candidate.cy = Math.min(tipFloor, Math.max(minCy, candidate.cy));
    if (allowEscape && !textInsidePanel(candidate, bounds)) return null;
    if (candidate.cy + candidate.halfH > candidate.tailY - 4) return null;
    if (candidate.tailY - (candidate.cy + candidate.halfH) > maxTail + 1) return null;
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

  if (hardConflicts(placed, bounds, allowEscape)) return null;
  return placed;
}

/**
 * Place bubbles with column bias + vertical stack. Always writes a placement;
 * prefers conflict-free stacks, otherwise last-resort tiny centered stack.
 */
export function placeItemsWithSlots(
  items: PanelTextLayoutItem[],
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  allowEscape: boolean,
): void {
  const zones = panelTextZones(bounds);
  const reservedTop = reservedTopFromItems(items, zones, allowEscape);
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

  if (working.length === 0) return;

  // Drop trailing dialogue until a conflict-free stack exists at a readable size.
  let active = working;
  let best: SpeechBubbleLayout[] | null = null;
  while (active.length > 0 && !best) {
    const fontFloor = active.length === 1 ? 5 : BUBBLE_MIN_READABLE_FONT;
    for (const scale of [1, 0.88, 0.75, 0.62]) {
      for (let font = 13; font >= fontFloor; font--) {
        const placed = tryStack(active, bounds, zones, allowEscape, font, reservedTop, scale);
        if (
          placed &&
          placed.every((bubble) => bubble.metrics.fontSize >= fontFloor)
        ) {
          best = placed;
          break;
        }
      }
      if (best) break;
    }
    if (!best) active = active.slice(0, -1);
  }

  if (!best || active.length === 0) return;

  const keepIndexes = new Set(active.map((row) => row.itemIndex));
  for (let i = 0; i < active.length; i++) {
    const item = items[active[i]!.itemIndex]!;
    if (item.kind !== 'bubble') continue;
    Object.assign(item.layout, best[i]!);
  }
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind === 'bubble' && !keepIndexes.has(i)) {
      items.splice(i, 1);
    }
  }
}

/** Estimate how many active dialogue lines a panel can host at readable font. */
export function maxDialogueBlocksForPanel(bounds: LayoutBounds): number {
  const zones = panelTextZones(bounds);
  const band = Math.max(0, zones.dialogueBottom - zones.dialogueTop);
  const perBlock = Math.max(32, BUBBLE_MIN_READABLE_FONT * 2.8 + ABOVE_GAP);
  const byHeight = Math.max(1, Math.floor(band / perBlock));
  // Narrow panels cannot fan multi-speaker tails at a readable size.
  const byWidth = bounds.w < 100 ? 1 : bounds.w < 170 ? 2 : 3;
  return Math.min(byHeight, byWidth);
}

/** Merge consecutive same-speaker lines, put captions first, then trim to dialogue budget. */
export function adaptBlocksToPanelBudget(
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
): PanelTextBlock[] {
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
  // Keep one caption max when dialogue budget is tight.
  const keptCaptions = captions.slice(0, keptDialogue.length <= 1 ? 1 : Math.min(1, captions.length));
  const keptSfx = keptDialogue.length >= maxDialogue && maxDialogue <= 1 ? [] : sfx;
  return [...keptCaptions, ...keptDialogue, ...keptSfx];
}
