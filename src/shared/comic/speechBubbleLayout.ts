import type { MarkerPlacement } from './characterArrangements';
import { characterMarkerLayoutBox, characterTailAnchor } from './characterMarkers';
import { activeMarkerPlacement, withMarkerPlacement } from './markerPlacementScope';
import { clampX, maxBubbleHalfWidth, panelTextZones } from './panelTextZones';
import { sfxBaseFontSize, sfxLayoutBBox, normalizeSfxLoudness } from './sfxLoudness';
import {
  placeBubblesWithForce,
  postClampBubbles,
  type ForceObstacle,
} from './speechBubbleForceLayout';
import {
  BUBBLE_FONT_SIZE,
  BUBBLE_MIN_READABLE_FONT,
  bubbleMetricsForLines,
  bubbleTextBlockHeight,
  fitDialogueLines,
  fitDialogueLinesWithinHalfH,
  isDialogueDisplayTruncated,
  maxCharsForWidth,
  pickBubbleShape,
  wrapDialogueText,
  type BubbleMetrics,
} from './speechBubblePath';
import {
  adaptBlocksToPanelBudget,
  placeItemsWithSlots,
  sanitizeSlotTextItems,
} from './speechBubbleSlotLayout';
import type { PanelCharacterId, PanelTextBlock, SfxLoudness } from './types';

export type LayoutBounds = { x: number; y: number; w: number; h: number };

function assignDialogueLines(
  layout: SpeechBubbleLayout,
  content: string,
  fitted: { lines: string[]; metrics: BubbleMetrics },
): void {
  layout.lines = fitted.lines;
  layout.metrics = fitted.metrics;
  layout.halfW = fitted.metrics.halfW;
  layout.halfH = fitted.metrics.halfH;
  layout.sourceContent = content;
  layout.truncated = isDialogueDisplayTruncated(content, fitted.lines);
}

export type PanelTextLayoutPlaceMode = 'force' | 'legacy' | 'slots';

export type PanelTextLayoutOptions = {
  allowBubbleEscape?: boolean;
  /**
   * Default `force` for shared callers.
   * Scrapboard sketchy boards use `slots` for ~98% hard-rule compliance.
   */
  placeMode?: PanelTextLayoutPlaceMode;
  /** Skip width/height budget trim (tests that assert exact block order). */
  skipBudget?: boolean;
  /** Arrangement-driven marker positions (Scrapboard character-first). */
  markerPlacement?: MarkerPlacement;
};

export type SpeechBubbleLayout = {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  tailX: number;
  tailY: number;
  lines: string[];
  characterId: PanelCharacterId;
  metrics: BubbleMetrics;
  /** Full dialogue string before wrap/ellipsis (for hover tooltips). */
  sourceContent?: string;
  /** True when `lines` omit part of `sourceContent`. */
  truncated?: boolean;
};

export type CaptionLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  maxWidth: number;
  lines: string[];
};

export type SfxLayout = {
  x: number;
  y: number;
  fontSize: number;
  text: string;
  loudness: SfxLoudness;
};

export type PanelTextLayoutItem =
  | { kind: 'caption'; layout: CaptionLayout }
  | { kind: 'bubble'; layout: SpeechBubbleLayout }
  | { kind: 'sfx'; layout: SfxLayout };

export type PanelTextLayout = {
  items: PanelTextLayoutItem[];
};

const CAPTION_PAD_X = 8;
const CAPTION_PAD_Y = 6;
const CAPTION_LINE_HEIGHT = 11;
const BLOCK_GAP = 6;
const OVERLAP_MARGIN = 4;
const MIN_BUBBLE_FONT = 5;
const BUBBLE_ABOVE_CHARACTER_GAP = 10;

/** Horizontal column bias — separates multi-speaker panels (A left, C center, B right). */
const CHARACTER_CX_RATIO: Record<PanelCharacterId, number> = {
  a: 0.28,
  b: 0.74,
  c: 0.5,
};

function cxRatio(characterId: PanelCharacterId, placement?: MarkerPlacement): number {
  const resolved = placement ?? activeMarkerPlacement();
  return resolved?.[characterId]?.x ?? CHARACTER_CX_RATIO[characterId];
}

/** Seed SFX away from the densest marker column so center “FWOOSH” doesn’t sit on C. */
function preferredSfxX(bounds: LayoutBounds, characterIds: PanelCharacterId[]): number {
  const ids = new Set(characterIds);
  if (ids.has('c')) {
    if (!ids.has('a')) return bounds.x + bounds.w * cxRatio('a');
    if (!ids.has('b')) return bounds.x + bounds.w * cxRatio('b');
    return bounds.x + bounds.w * 0.16;
  }
  if (ids.has('a') && !ids.has('b')) return bounds.x + bounds.w * cxRatio('b');
  if (ids.has('b') && !ids.has('a')) return bounds.x + bounds.w * cxRatio('a');
  return bounds.x + bounds.w * 0.5;
}

type BBox = { left: number; top: number; right: number; bottom: number };

function preferredBubbleCx(
  bounds: LayoutBounds,
  characterId: PanelCharacterId,
  halfW: number,
  tailX: number,
  sidePad: number,
): number {
  const columnX = bounds.x + bounds.w * cxRatio(characterId);
  const blended = tailX * 0.42 + columnX * 0.58;
  return clampX(blended, halfW, bounds, sidePad);
}

function wrapCaption(content: string, maxChars: number): string[] {
  return wrapDialogueText(content, maxChars, 4);
}

function captionBox(lines: string[], bounds: LayoutBounds): { width: number; height: number } {
  const longest = Math.max(...lines.map((line) => line.length), 4);
  const width = Math.min(bounds.w - 20, Math.max(72, longest * 5.8 + CAPTION_PAD_X * 2));
  const height = lines.length * CAPTION_LINE_HEIGHT + CAPTION_PAD_Y * 2;
  return { width, height };
}

function itemBBox(item: PanelTextLayoutItem): BBox {
  if (item.kind === 'caption') {
    const c = item.layout;
    return { left: c.x, top: c.y, right: c.x + c.width, bottom: c.y + c.height };
  }
  if (item.kind === 'bubble') {
    const b = item.layout;
    return {
      left: b.cx - b.halfW,
      top: b.cy - b.halfH,
      right: b.cx + b.halfW,
      bottom: b.cy + b.halfH,
    };
  }
  return sfxLayoutBBox(item.layout);
}

function boxesOverlap(a: BBox, b: BBox, margin = OVERLAP_MARGIN): boolean {
  return !(
    a.right + margin <= b.left ||
    b.right + margin <= a.left ||
    a.bottom + margin <= b.top ||
    b.bottom + margin <= a.top
  );
}

function horizontalOverlap(a: BBox, b: BBox, margin = OVERLAP_MARGIN): boolean {
  return !(a.right + margin <= b.left || b.right + margin <= a.left);
}

function blockHasContent(block: PanelTextBlock): boolean {
  return block.content.trim().length > 0;
}

function bubbleDialogueTop(zones: ReturnType<typeof panelTextZones>, allowEscape = false): number {
  return allowEscape ? zones.bounds.y + 2 : zones.dialogueTop;
}

function constrainBubbleVertical(
  cy: number,
  halfH: number,
  tailY: number,
  zones: ReturnType<typeof panelTextZones>,
  allowEscape = false,
): number {
  const maxCy = Math.min(
    zones.dialogueBottom - halfH,
    tailY - halfH - OVERLAP_MARGIN,
  );
  return Math.min(maxCy, Math.max(bubbleDialogueTop(zones, allowEscape) + halfH, cy));
}

function bubbleCyAboveCharacter(
  tailY: number,
  halfH: number,
  zones: ReturnType<typeof panelTextZones>,
  allowEscape = false,
): number {
  return constrainBubbleVertical(
    tailY - halfH - BUBBLE_ABOVE_CHARACTER_GAP,
    halfH,
    tailY,
    zones,
    allowEscape,
  );
}

function stackItemsVertically(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
  allowEscape = false,
): boolean {
  const bandTop = bubbleDialogueTop(zones, allowEscape);
  let textCursor = bandTop;
  const bubbleBottomByCharacter = new Map<PanelCharacterId, number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;

    if (item.kind === 'caption') {
      if (textCursor + item.layout.height > zones.dialogueBottom) return false;
      item.layout.y = textCursor;
      textCursor = item.layout.y + item.layout.height + BLOCK_GAP;
      continue;
    }

    if (item.kind === 'bubble') {
      const reservedBelow = reservedHeightBelow(items, i, zones);
      const priorCharBottom = bubbleBottomByCharacter.get(item.layout.characterId);
      const anchoredTop = item.layout.tailY - item.layout.halfH * 2 - BUBBLE_ABOVE_CHARACTER_GAP;
      let minTop: number;
      if (priorCharBottom != null) {
        minTop = priorCharBottom;
      } else {
        minTop = Math.max(textCursor, anchoredTop);
      }
      for (let j = 0; j < i; j++) {
        const previous = items[j];
        if (previous?.kind !== 'bubble') continue;
        const previousBox = itemBBox(previous);
        const currentBox = itemBBox({
          kind: 'bubble',
          layout: { ...item.layout, cy: minTop + item.layout.halfH },
        });
        if (horizontalOverlap(previousBox, currentBox)) {
          minTop = Math.max(minTop, previous.layout.cy + previous.layout.halfH + BLOCK_GAP);
        }
      }
      const top = minTop;
      let cy = top + item.layout.halfH;
      const isCharContinuation = priorCharBottom != null;
      const maxCy = isCharContinuation
        ? zones.dialogueBottom - reservedBelow - item.layout.halfH
        : Math.min(
            item.layout.tailY - item.layout.halfH - OVERLAP_MARGIN,
            zones.dialogueBottom - reservedBelow - item.layout.halfH,
          );
      if (cy > maxCy) {
        cy = maxCy;
      }
      if (cy - item.layout.halfH < minTop - 0.5) {
        cy = minTop + item.layout.halfH;
        if (cy > maxCy) return false;
      }
      item.layout.cy = cy;
      item.layout.cy = Math.min(
        zones.dialogueBottom - item.layout.halfH,
        Math.max(bandTop + item.layout.halfH, item.layout.cy),
      );
      bubbleBottomByCharacter.set(
        item.layout.characterId,
        cy + item.layout.halfH + BLOCK_GAP,
      );
      const next = items[i + 1];
      if (next?.kind === 'caption' || next?.kind === 'sfx') {
        textCursor = Math.max(textCursor, cy + item.layout.halfH + BLOCK_GAP);
      }
      continue;
    }

    if (textCursor + item.layout.fontSize > zones.dialogueBottom) return false;
    item.layout.y = textCursor + item.layout.fontSize;
    textCursor = item.layout.y + BLOCK_GAP;
  }

  return true;
}

function reservedHeightBelow(
  items: PanelTextLayoutItem[],
  startIndex: number,
  zones: ReturnType<typeof panelTextZones>,
): number {
  let need = 0;
  for (let j = startIndex + 1; j < items.length; j++) {
    const next = items[j]!;
    if (next.kind === 'caption') {
      need += next.layout.height + BLOCK_GAP;
    } else if (next.kind === 'bubble') {
      need += next.layout.halfH * 2 + BLOCK_GAP;
    } else {
      need += next.layout.fontSize + BLOCK_GAP;
    }
  }
  return Math.min(need, zones.dialogueBottom - zones.dialogueTop);
}

function conservativeBubbleHalfW(innerWidth: number, maxHalfW: number): number {
  return Math.min(maxHalfW, innerWidth * 0.11);
}

function countVerticalBubbleLanes(
  bubbleItems: { layout: SpeechBubbleLayout }[],
  bounds: LayoutBounds,
  innerWidth: number,
  maxHalfW: number,
): number {
  if (bubbleItems.length <= 1) return bubbleItems.length;

  const n = bubbleItems.length;
  const parent = Array.from({ length: n }, (_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]!]!;
      root = parent[root]!;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  for (let i = 0; i < n; i++) {
    const bi = bubbleItems[i]!.layout;
    const halfW = bi.halfW > 0 ? bi.halfW : conservativeBubbleHalfW(innerWidth, maxHalfW);
    const cx = bi.cx > 0 ? bi.cx : bounds.x + bounds.w * cxRatio(bi.characterId);
    const boxI = { left: cx - halfW, right: cx + halfW };
    for (let j = i + 1; j < n; j++) {
      const bj = bubbleItems[j]!.layout;
      if (bi.characterId === bj.characterId) {
        union(i, j);
        continue;
      }
      const halfWj = bj.halfW > 0 ? bj.halfW : conservativeBubbleHalfW(innerWidth, maxHalfW);
      const cxj = bj.cx > 0 ? bj.cx : bounds.x + bounds.w * cxRatio(bj.characterId);
      const boxJ = { left: cxj - halfWj, right: cxj + halfWj };
      if (boxI.right + OVERLAP_MARGIN > boxJ.left && boxJ.right + OVERLAP_MARGIN > boxI.left) {
        union(i, j);
      }
    }
  }

  const roots = new Set<number>();
  for (let i = 0; i < n; i++) roots.add(find(i));
  return roots.size;
}

function maxBubbleHalfHForStack(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
  bounds: LayoutBounds,
  innerWidth: number,
  maxHalfW: number,
  allowEscape = false,
): number {
  const bubbleItems = items.filter(
    (item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble',
  );
  if (bubbleItems.length === 0) return 48;
  let used = 0;
  for (const item of items) {
    if (item.kind === 'caption') used += item.layout.height + BLOCK_GAP;
    if (item.kind === 'sfx') used += item.layout.fontSize + BLOCK_GAP;
  }
  const available = zones.dialogueBottom - bubbleDialogueTop(zones, allowEscape) - used;
  const lanes = countVerticalBubbleLanes(bubbleItems, bounds, innerWidth, maxHalfW);
  return Math.max(8, available / lanes / 2 - BLOCK_GAP);
}

function resolveBubblePairOverlaps(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
): void {
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (current?.kind !== 'bubble') continue;
    for (let j = 0; j < i; j++) {
      const previous = items[j];
      if (previous?.kind !== 'bubble') continue;
      if (!boxesOverlap(itemBBox(current), itemBBox(previous))) continue;
      const liftedCy =
        previous.layout.cy - current.layout.halfH - BLOCK_GAP;
      const maxCy = current.layout.tailY - current.layout.halfH - OVERLAP_MARGIN;
      current.layout.cy = Math.min(maxCy, Math.max(zones.dialogueTop + current.layout.halfH, liftedCy));
    }
  }
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (current?.kind === 'caption') {
      for (let j = 0; j < i; j++) {
        const previous = items[j];
        if (previous?.kind !== 'bubble') continue;
        if (!boxesOverlap(itemBBox(current), itemBBox(previous))) continue;
        current.layout.y = previous.layout.cy + previous.layout.halfH + BLOCK_GAP;
      }
      continue;
    }
    if (current?.kind !== 'bubble') continue;
    for (let j = i + 1; j < items.length; j++) {
      const next = items[j];
      if (next?.kind !== 'caption') continue;
      if (!boxesOverlap(itemBBox(current), itemBBox(next))) continue;
      current.layout.cy = Math.min(
        current.layout.cy,
        next.layout.y - current.layout.halfH - BLOCK_GAP,
      );
    }
  }
}

function stackHasOverlaps(items: PanelTextLayoutItem[]): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    if (boxesOverlap(itemBBox(items[i]!), itemBBox(items[i + 1]!))) return true;
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (boxesOverlap(itemBBox(items[i]!), itemBBox(items[j]!))) return true;
    }
  }
  return false;
}

function compressStackToDialogueBand(
  items: PanelTextLayoutItem[],
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  zones: ReturnType<typeof panelTextZones>,
  allowEscape = false,
): void {
  if (items.length === 0) return;
  const activeBlocks = blocks.filter(blockHasContent);
  const maxHalfW = maxBubbleHalfWidth(bounds, zones.sidePad);
  const innerWidth = bounds.w - zones.sidePad * 2;
  const maxHalfH = maxBubbleHalfHForStack(items, zones, bounds, innerWidth, maxHalfW, allowEscape);
  let fontCap = BUBBLE_FONT_SIZE;
  let lineCap = 6;
  const bubbleCount = items.filter((item) => item.kind === 'bubble').length;
  const zoneHeight = zones.dialogueBottom - bubbleDialogueTop(zones, allowEscape);
  if (bubbleCount >= 3 && zoneHeight < 72) {
    fontCap = 9;
    lineCap = 3;
  } else if (bubbleCount >= 3 && zoneHeight < 100) {
    fontCap = 10;
    lineCap = 4;
  } else if (bubbleCount >= 2 && zoneHeight < 68) {
    fontCap = 9;
    lineCap = 3;
  }

  const bubbleShape = pickBubbleShape(bounds.h, zoneHeight, maxHalfH);

  for (let attempt = 0; attempt < 48; attempt++) {
    const snapshot = items.map((item) => structuredClone(item));

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const block = activeBlocks[i];
      if (!block) continue;

      if (item.kind === 'bubble' && block.kind === 'dialogue') {
        let fitted = fitDialogueLines(
          block.content,
          maxHalfW,
          innerWidth,
          fontCap,
          lineCap,
          bubbleShape,
        );
        if (fitted.metrics.halfH > maxHalfH + 0.5) {
          fitted = fitDialogueLinesWithinHalfH(
            block.content,
            maxHalfW,
            maxHalfH,
            innerWidth,
            fontCap,
            bubbleShape,
          );
        } else {
          const innerH = fitted.metrics.halfH * 2 - fitted.metrics.padY * 2;
          const textH = bubbleTextBlockHeight(
            fitted.lines.length,
            fitted.metrics.lineHeight,
            fitted.metrics.fontSize,
          );
          if (textH > innerH + 0.5) {
            fitted = fitDialogueLinesWithinHalfH(
              block.content,
              maxHalfW,
              Math.min(fitted.metrics.halfH, maxHalfH),
              innerWidth,
              fontCap,
              bubbleShape,
            );
          }
        }
        assignDialogueLines(item.layout, block.content, fitted);
        item.layout.cx = preferredBubbleCx(
          bounds,
          item.layout.characterId,
          item.layout.halfW,
          item.layout.tailX,
          zones.sidePad,
        );
      } else if (item.kind === 'caption' && block.kind === 'caption') {
        const lines = wrapCaption(block.content, Math.min(42, maxCharsForWidth(innerWidth, fontCap)));
        const capped = lines.slice(0, lineCap);
        const box = captionBox(capped, bounds);
        item.layout.lines = capped;
        item.layout.width = Math.min(box.width, bounds.w - zones.sidePad * 2 - 4);
        item.layout.height = box.height;
      } else if (item.kind === 'sfx' && block.kind === 'sfx') {
        const floor = sfxBaseFontSize(bounds.w, block.loudness);
        item.layout.fontSize = Math.max(
          MIN_BUBBLE_FONT,
          Math.min(floor, Math.max(fontCap + 2, Math.round(floor * 0.85))),
        );
        item.layout.loudness = normalizeSfxLoudness(block.loudness);
        item.layout.text = block.content.slice(0, 14);
      }
    }

    if (stackItemsVertically(items, zones, allowEscape)) {
      resolveBubblePairOverlaps(items, zones);
      if (!stackHasOverlaps(items)) return;
    }

    for (let i = 0; i < items.length; i++) {
      items[i] = snapshot[i]!;
    }

    if (fontCap > MIN_BUBBLE_FONT) {
      fontCap -= 1;
    } else if (lineCap > 1) {
      lineCap -= 1;
      fontCap = BUBBLE_FONT_SIZE;
    } else {
      break;
    }
  }

  applyMinimalStackFit(items, activeBlocks, bounds, zones, maxHalfW, innerWidth, allowEscape);
}

function applyMinimalStackFit(
  items: PanelTextLayoutItem[],
  activeBlocks: PanelTextBlock[],
  bounds: LayoutBounds,
  zones: ReturnType<typeof panelTextZones>,
  maxHalfW: number,
  innerWidth: number,
  allowEscape = false,
): void {
  const maxHalfH = maxBubbleHalfHForStack(items, zones, bounds, innerWidth, maxHalfW, allowEscape);
  const zoneHeight = zones.dialogueBottom - bubbleDialogueTop(zones, allowEscape);
  const bubbleShape = pickBubbleShape(bounds.h, zoneHeight, maxHalfH);
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const block = activeBlocks[i];
    if (!block) continue;
    if (item.kind === 'bubble' && block.kind === 'dialogue') {
      let fitted = fitDialogueLines(
        block.content,
        maxHalfW,
        innerWidth,
        BUBBLE_MIN_READABLE_FONT,
        2,
        bubbleShape,
      );
      if (fitted.metrics.halfH > maxHalfH + 0.5) {
        fitted = fitDialogueLinesWithinHalfH(
          block.content,
          maxHalfW,
          maxHalfH,
          innerWidth,
          BUBBLE_MIN_READABLE_FONT,
          bubbleShape,
        );
      }
      assignDialogueLines(item.layout, block.content, fitted);
      item.layout.cx = preferredBubbleCx(
        bounds,
        item.layout.characterId,
        item.layout.halfW,
        item.layout.tailX,
        zones.sidePad,
      );
    } else if (item.kind === 'caption' && block.kind === 'caption') {
      const lines = wrapCaption(block.content, maxCharsForWidth(innerWidth, MIN_BUBBLE_FONT)).slice(0, 1);
      const box = captionBox(lines, bounds);
      item.layout.lines = lines;
      item.layout.width = Math.min(box.width, bounds.w - zones.sidePad * 2 - 4);
      item.layout.height = box.height;
    } else if (item.kind === 'sfx' && block.kind === 'sfx') {
      const floor = sfxBaseFontSize(bounds.w, block.loudness);
      item.layout.fontSize = Math.max(MIN_BUBBLE_FONT, Math.round(floor * 0.55));
      item.layout.loudness = normalizeSfxLoudness(block.loudness);
      item.layout.text = block.content.slice(0, 6);
    }
  }

  if (stackItemsVertically(items, zones, allowEscape)) {
    resolveBubblePairOverlaps(items, zones);
  }
}

function clampBubblesToDialogueZone(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
  allowEscape = false,
): void {
  const bandTop = bubbleDialogueTop(zones, allowEscape);
  for (const item of items) {
    if (item.kind !== 'bubble') continue;
    const minCy = bandTop + item.layout.halfH;
    const maxCy = zones.dialogueBottom - item.layout.halfH;
    item.layout.cy = Math.min(maxCy, Math.max(minCy, item.layout.cy));
  }
}

function resolveAllPairOverlaps(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
): void {
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      const later = items[i]!;
      const earlier = items[j]!;
      if (!boxesOverlap(itemBBox(later), itemBBox(earlier))) continue;

      if (later.kind === 'bubble' && earlier.kind === 'bubble') {
        if (
          later.layout.characterId !== earlier.layout.characterId &&
          horizontalOverlap(itemBBox(later), itemBBox(earlier))
        ) {
          const bounds = zones.bounds;
          later.layout.cx = preferredBubbleCx(
            bounds,
            later.layout.characterId,
            later.layout.halfW,
            later.layout.tailX,
            zones.sidePad,
          );
        }
        const minLaterCy =
          earlier.layout.cy + earlier.layout.halfH + BLOCK_GAP + later.layout.halfH;
        const maxLaterCy = zones.dialogueBottom - later.layout.halfH;
        if (minLaterCy <= maxLaterCy + 0.5) {
          later.layout.cy = Math.min(maxLaterCy, Math.max(minLaterCy, later.layout.cy));
        } else {
          const maxEarlierCy =
            later.layout.cy - later.layout.halfH - BLOCK_GAP - earlier.layout.halfH;
          earlier.layout.cy = Math.max(
            zones.dialogueTop + earlier.layout.halfH,
            Math.min(earlier.layout.cy, maxEarlierCy),
          );
        }
        continue;
      }

      if (later.kind === 'caption' && earlier.kind === 'bubble') {
        later.layout.y = Math.max(
          later.layout.y,
          earlier.layout.cy + earlier.layout.halfH + BLOCK_GAP,
        );
        continue;
      }

      if (later.kind === 'bubble' && earlier.kind === 'caption') {
        const minCy = earlier.layout.y + earlier.layout.height + BLOCK_GAP + later.layout.halfH;
        later.layout.cy = Math.min(
          zones.dialogueBottom - later.layout.halfH,
          Math.max(minCy, later.layout.cy),
        );
      }
    }
  }
}

function resolveSequentialOverlaps(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
): void {
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i]!;
    const next = items[i + 1]!;
    if (!boxesOverlap(itemBBox(current), itemBBox(next))) continue;

    if (next.kind === 'caption') {
      next.layout.y = Math.max(
        next.layout.y,
        current.kind === 'bubble'
          ? current.layout.cy + current.layout.halfH + BLOCK_GAP
          : current.kind === 'caption'
            ? current.layout.y + current.layout.height + BLOCK_GAP
            : current.layout.y + BLOCK_GAP,
      );
      continue;
    }

    if (next.kind === 'bubble' && current.kind === 'bubble') {
      const minNextCy =
        current.layout.cy + current.layout.halfH + BLOCK_GAP + next.layout.halfH;
      const maxNextCy = zones.dialogueBottom - next.layout.halfH;
      if (minNextCy > maxNextCy + 0.5) {
        const maxCurrentCy =
          next.layout.cy - next.layout.halfH - BLOCK_GAP - current.layout.halfH;
        current.layout.cy = Math.max(
          zones.dialogueTop + current.layout.halfH,
          Math.min(current.layout.cy, maxCurrentCy),
        );
      } else {
        next.layout.cy = Math.min(maxNextCy, Math.max(minNextCy, next.layout.cy));
      }
      continue;
    }

    if (next.kind === 'bubble' && current.kind === 'caption') {
      const minCy = current.layout.y + current.layout.height + BLOCK_GAP + next.layout.halfH;
      next.layout.cy = Math.min(
        zones.dialogueBottom - next.layout.halfH,
        Math.max(minCy, next.layout.cy),
      );
    }
  }
}

function enforceBubbleTailGap(items: PanelTextLayoutItem[]): void {
  for (const item of items) {
    if (item.kind !== 'bubble') continue;
    const maxCy = item.layout.tailY - item.layout.halfH - OVERLAP_MARGIN;
    item.layout.cy = Math.min(item.layout.cy, maxCy);
  }
}

function maxHalfHForBubbleAtPosition(
  bubble: SpeechBubbleLayout,
  zones: ReturnType<typeof panelTextZones>,
): number {
  return Math.max(
    5,
    Math.min(
      bubble.cy - zones.dialogueTop,
      zones.dialogueBottom - bubble.cy,
      bubble.tailY - OVERLAP_MARGIN - bubble.cy,
    ),
  );
}

function refitBubblesAtFinalPositions(
  items: PanelTextLayoutItem[],
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  zones: ReturnType<typeof panelTextZones>,
): void {
  const activeBlocks = blocks.filter(blockHasContent);
  const maxHalfW = maxBubbleHalfWidth(bounds, zones.sidePad);
  const innerWidth = bounds.w - zones.sidePad * 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const block = activeBlocks[i];
    if (item?.kind !== 'bubble' || block?.kind !== 'dialogue') continue;

    const maxHalfH = maxHalfHForBubbleAtPosition(item.layout, zones);
    const bubbleShape = item.layout.metrics.shape;
    let fitted = fitDialogueLines(
      block.content,
      maxHalfW,
      innerWidth,
      item.layout.metrics.fontSize,
      8,
      bubbleShape,
    );
    if (fitted.metrics.halfH > maxHalfH + 0.5) {
      fitted = fitDialogueLinesWithinHalfH(
        block.content,
        maxHalfW,
        maxHalfH,
        innerWidth,
        item.layout.metrics.fontSize,
        bubbleShape,
      );
    }
    assignDialogueLines(item.layout, block.content, fitted);
    // Keep force/legacy cx — only clamp within the panel after size changes.
    item.layout.cx = clampX(item.layout.cx, item.layout.halfW, bounds, zones.sidePad);
    const minCy = zones.dialogueTop + item.layout.halfH;
    const maxCy = Math.min(
      zones.dialogueBottom - item.layout.halfH,
      item.layout.tailY - item.layout.halfH - OVERLAP_MARGIN,
    );
    item.layout.cy = Math.min(maxCy, Math.max(minCy, item.layout.cy));
  }
}

/**
 * Keep SFX off character markers (bubbles already enforce this). Prefer dialogue-band
 * baselines + horizontal parking when a push-down would land on a marker.
 */
function resolveSfxCharacterOverlaps(items: PanelTextLayoutItem[], bounds: LayoutBounds): void {
  const characterIds = [
    ...new Set(
      items
        .filter(
          (item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble',
        )
        .map((item) => item.layout.characterId),
    ),
  ];
  if (characterIds.length === 0) return;

  const zones = panelTextZones(bounds);
  const markerBoxes: BBox[] = characterIds.map((id) => {
    const marker = characterMarkerLayoutBox(bounds, id);
    return {
      left: marker.left,
      top: marker.top,
      right: marker.right,
      bottom: marker.bottom,
    };
  });
  const bubbleBoxes = items
    .filter(
      (item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble',
    )
    .map((item) => itemBBox(item));

  const maxBaseline = Math.min(
    zones.characterBandTop - 2,
    ...markerBoxes.map((box) => box.top - OVERLAP_MARGIN),
  );

  for (const item of items) {
    if (item.kind !== 'sfx') continue;
    const sfx = item.layout;
    const overlapsMarkers = (): boolean =>
      markerBoxes.some((box) => boxesOverlap(sfxLayoutBBox(sfx), box));
    const overlapsBubbles = (): boolean =>
      bubbleBoxes.some((box) => boxesOverlap(sfxLayoutBBox(sfx), box));

    if (!overlapsMarkers()) {
      // Still clamp baseline out of the character band when sync pushed it down.
      if (sfx.y > maxBaseline) sfx.y = Math.max(zones.dialogueTop + sfx.fontSize, maxBaseline);
      if (!overlapsMarkers()) continue;
    }

    sfx.y = Math.min(sfx.y, Math.max(zones.dialogueTop + sfx.fontSize, maxBaseline));

    const probeHalfW = (sfxLayoutBBox(sfx).right - sfxLayoutBBox(sfx).left) / 2;
    const minX = bounds.x + zones.sidePad + probeHalfW;
    const maxX = bounds.x + bounds.w - zones.sidePad - probeHalfW;
    const xCandidates = [
      sfx.x,
      preferredSfxX(bounds, characterIds),
      bounds.x + bounds.w * 0.18,
      bounds.x + bounds.w * 0.82,
      bounds.x + bounds.w * cxRatio('a'),
      bounds.x + bounds.w * cxRatio('b'),
      minX,
      maxX,
    ].map((x) => Math.min(maxX, Math.max(minX, x)));
    const yCandidates = [
      sfx.y,
      maxBaseline,
      Math.max(zones.dialogueTop + sfx.fontSize, maxBaseline - sfx.fontSize * 0.35),
      zones.dialogueTop + sfx.fontSize + 4,
    ];

    let best: { x: number; y: number; score: number } | null = null;
    const originX = sfx.x;
    const originY = sfx.y;
    for (const y of yCandidates) {
      for (const x of xCandidates) {
        sfx.x = x;
        sfx.y = y;
        const score =
          (overlapsMarkers() ? 1000 : 0) +
          (overlapsBubbles() ? 10 : 0) +
          Math.abs(x - originX) * 0.01 +
          Math.abs(y - originY) * 0.01;
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    sfx.x = best?.x ?? originX;
    sfx.y = best?.y ?? originY;
  }
}

/** One deterministic pass: keep caption/SFX below earlier bubbles when ordered that way. */
function syncCaptionSfxAfterPlacement(items: PanelTextLayoutItem[], zones: ReturnType<typeof panelTextZones>): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.kind === 'caption') {
      let minY = zones.dialogueTop;
      for (let j = 0; j < i; j++) {
        const previous = items[j]!;
        if (previous.kind === 'bubble') {
          // Caption after dialogue must sit below the bubble body, not just the center.
          minY = Math.max(minY, previous.layout.cy + previous.layout.halfH + BLOCK_GAP);
        } else if (previous.kind === 'caption') {
          minY = Math.max(minY, previous.layout.y + previous.layout.height + BLOCK_GAP);
        } else {
          minY = Math.max(minY, previous.layout.y + BLOCK_GAP);
        }
      }
      item.layout.y = Math.max(minY, item.layout.y);
      continue;
    }
    if (item.kind === 'sfx') {
      let minBaseline = zones.dialogueTop + item.layout.fontSize;
      for (let j = 0; j < i; j++) {
        const previous = items[j]!;
        if (previous.kind === 'bubble') {
          minBaseline = Math.max(
            minBaseline,
            previous.layout.cy +
              previous.layout.halfH +
              item.layout.fontSize * 1.05 +
              BLOCK_GAP,
          );
        } else if (previous.kind === 'caption') {
          minBaseline = Math.max(
            minBaseline,
            previous.layout.y + previous.layout.height + item.layout.fontSize * 1.05 + BLOCK_GAP,
          );
        }
      }
      item.layout.y = Math.max(minBaseline, item.layout.y);
    }
  }
}

/**
 * Shared size/fit phase — builds captions, sized bubbles, and SFX with seed positions.
 */
function seedPanelTextItems(
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  allowEscape: boolean,
): PanelTextLayoutItem[] {
  const zones = panelTextZones(bounds);
  const maxHalfW = maxBubbleHalfWidth(bounds, zones.sidePad);
  const maxChars = maxCharsForWidth(bounds.w - zones.sidePad * 2, bubbleMetricsForLines(['x']).fontSize);
  const items: PanelTextLayoutItem[] = [];
  let cursorY = zones.dialogueTop;

  for (const block of blocks) {
    if (!blockHasContent(block)) continue;

    if (block.kind === 'caption') {
      const lines = wrapCaption(block.content, Math.min(42, maxChars + 12));
      const box = captionBox(lines, bounds);
      const y = Math.min(cursorY, zones.dialogueBottom - box.height);
      const layout: CaptionLayout = {
        x: bounds.x + zones.sidePad + 2,
        y,
        width: Math.min(box.width, bounds.w - zones.sidePad * 2 - 4),
        height: box.height,
        maxWidth: bounds.w - 20,
        lines,
      };
      items.push({ kind: 'caption', layout });
      cursorY = y + box.height + BLOCK_GAP;
      continue;
    }

    if (block.kind === 'dialogue') {
      const innerWidth = bounds.w - zones.sidePad * 2;
      const zoneHeight = zones.dialogueBottom - bubbleDialogueTop(zones, allowEscape);
      const initialShape = pickBubbleShape(bounds.h, zoneHeight, zoneHeight / 2);
      const fitted = fitDialogueLines(
        block.content,
        maxHalfW,
        innerWidth,
        BUBBLE_FONT_SIZE,
        8,
        initialShape,
      );
      const { metrics } = fitted;
      const anchor = characterTailAnchor(bounds, block.characterId);
      const preferredCx = preferredBubbleCx(
        bounds,
        block.characterId,
        metrics.halfW,
        anchor.x,
        zones.sidePad,
      );
      const cy = bubbleCyAboveCharacter(anchor.y, metrics.halfH, zones, allowEscape);

      const layout: SpeechBubbleLayout = {
        cx: preferredCx,
        cy,
        halfW: metrics.halfW,
        halfH: metrics.halfH,
        tailX: anchor.x,
        tailY: anchor.y,
        lines: fitted.lines,
        characterId: block.characterId,
        metrics,
      };
      assignDialogueLines(layout, block.content, fitted);
      items.push({
        kind: 'bubble',
        layout,
      });
      cursorY = Math.max(cursorY, cy + metrics.halfH + BLOCK_GAP);
      continue;
    }

    if (block.kind === 'sfx') {
      const loudness = normalizeSfxLoudness(block.loudness);
      const fontSize = sfxBaseFontSize(bounds.w, loudness);
      const speakers = blocks
        .filter(
          (b): b is Extract<PanelTextBlock, { kind: 'dialogue' }> =>
            b.kind === 'dialogue' && Boolean(b.content.trim()),
        )
        .map((b) => b.characterId);
      const layout: SfxLayout = {
        x: preferredSfxX(bounds, speakers),
        // Keep seed baseline out of the character band; post-resolve nudges if sync pushes down.
        y: Math.min(cursorY + fontSize, zones.characterBandTop - 2),
        fontSize,
        text: block.content.slice(0, 14),
        loudness,
      };
      items.push({ kind: 'sfx', layout });
      cursorY += fontSize + BLOCK_GAP;
    }
  }

  return items;
}

/** Captions AND SFX are first-class placement obstacles (used during force placement, not only post-sync). */
function obstaclesFromItems(items: PanelTextLayoutItem[]): ForceObstacle[] {
  const obstacles: ForceObstacle[] = [];
  for (const item of items) {
    if (item.kind === 'caption') {
      obstacles.push({
        cx: item.layout.x + item.layout.width / 2,
        cy: item.layout.y + item.layout.height / 2,
        halfW: item.layout.width / 2,
        halfH: item.layout.height / 2,
      });
    } else if (item.kind === 'sfx') {
      const box = sfxLayoutBBox(item.layout);
      obstacles.push({
        cx: (box.left + box.right) / 2,
        cy: (box.top + box.bottom) / 2,
        halfW: (box.right - box.left) / 2,
        halfH: (box.bottom - box.top) / 2,
      });
    }
  }
  return obstacles;
}

function resolveCaptionBubbleOverlaps(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.kind !== 'caption') continue;
    const captionBox = itemBBox(item);
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const other = items[j]!;
      if (other.kind !== 'bubble') continue;
      if (!boxesOverlap(captionBox, itemBBox(other))) continue;
      if (i < j) {
        const maxCy = Math.min(
          zones.dialogueBottom - other.layout.halfH,
          other.layout.tailY - other.layout.halfH - 4,
        );
        const desired = item.layout.y + item.layout.height + BLOCK_GAP + other.layout.halfH;
        other.layout.cy = Math.min(maxCy, Math.max(other.layout.cy, desired));
      } else {
        item.layout.y = other.layout.cy + other.layout.halfH + BLOCK_GAP;
      }
    }
    item.layout.y = Math.min(item.layout.y, zones.dialogueBottom - item.layout.height);
  }
}

function placeItemsWithForce(
  items: PanelTextLayoutItem[],
  bounds: LayoutBounds,
  allowEscape: boolean,
): void {
  const bubbles = items
    .filter((item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble')
    .map((item) => item.layout);
  placeBubblesWithForce(bubbles, {
    bounds,
    allowBubbleEscape: allowEscape,
    obstacles: obstaclesFromItems(items),
  });
}

function placeItemsLegacy(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
  allowEscape: boolean,
): void {
  for (let pass = 0; pass < 4; pass++) {
    if (!stackItemsVertically(items, zones, allowEscape)) break;
    resolveBubblePairOverlaps(items, zones);
    resolveSequentialOverlaps(items, zones);
    if (!stackHasOverlaps(items)) break;
  }

  for (let pass = 0; pass < 8; pass++) {
    resolveAllPairOverlaps(items, zones);
    enforceBubbleTailGap(items);
    clampBubblesToDialogueZone(items, zones, allowEscape);
    if (!stackHasOverlaps(items)) break;
  }

  enforceBubbleTailGap(items);
  clampBubblesToDialogueZone(items, zones, allowEscape);
}

/**
 * Place captions, dialogue bubbles, and SFX in reading order with zoned layout.
 * Default placer is headless d3-force (`placeMode: 'force'`). Scrapboard uses `slots`.
 */
export function layoutPanelTextBlocks(
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  options?: PanelTextLayoutOptions,
): PanelTextLayout {
  return withMarkerPlacement(options?.markerPlacement, () => {
  const zones = panelTextZones(bounds);
  const allowEscape = options?.allowBubbleEscape ?? false;
  const placeMode = options?.placeMode ?? 'force';
  // Drop unreadable chrome on ultra-narrow/flat panels before seeding balloons.
  const budgeted = options?.skipBudget ? blocks : adaptBlocksToPanelBudget(blocks, bounds);
  const items = seedPanelTextItems(budgeted, bounds, allowEscape);

  if (placeMode !== 'slots') {
    // Force/legacy use stack compression. Slots owns shrink-to-fit itself.
    compressStackToDialogueBand(items, budgeted, bounds, zones, allowEscape);
  }

  if (placeMode === 'legacy') {
    placeItemsLegacy(items, zones, allowEscape);
  } else if (placeMode === 'slots') {
    placeItemsWithSlots(items, budgeted, bounds, allowEscape);
  } else {
    placeItemsWithForce(items, bounds, allowEscape);
  }

  syncCaptionSfxAfterPlacement(items, zones);
  if (placeMode !== 'slots') {
    refitBubblesAtFinalPositions(items, blocks, bounds, zones);
  }
  if (placeMode === 'force') {
    // Bottom-up pack owns band + tail gap + non-overlap. Skipping enforceBubbleTailGap /
    // clampBubblesToDialogueZone here — those clamp every bubble independently and can
    // either re-crush stacks or push bottoms past tailY.
    postClampBubbles(
      items
        .filter((item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble')
        .map((item) => item.layout),
      zones,
      allowEscape,
      obstaclesFromItems(items),
    );
    syncCaptionSfxAfterPlacement(items, zones);
    resolveCaptionBubbleOverlaps(items, zones);
    postClampBubbles(
      items
        .filter((item): item is { kind: 'bubble'; layout: SpeechBubbleLayout } => item.kind === 'bubble')
        .map((item) => item.layout),
      zones,
      allowEscape,
      obstaclesFromItems(items),
    );
    syncCaptionSfxAfterPlacement(items, zones);
  } else if (placeMode === 'slots') {
    // Slots reserves caption band and owns non-overlap; caption-bump would break the stack.
    syncCaptionSfxAfterPlacement(items, zones);
    sanitizeSlotTextItems(items, bounds);
  } else {
    enforceBubbleTailGap(items);
    clampBubblesToDialogueZone(items, zones, allowEscape);
    syncCaptionSfxAfterPlacement(items, zones);
    resolveCaptionBubbleOverlaps(items, zones);
  }

  if (!allowEscape) {
    for (const item of items) {
      if (item.kind !== 'bubble') continue;
      item.layout.cx = clampX(item.layout.cx, item.layout.halfW, bounds, zones.sidePad);
    }
  }

  resolveSfxCharacterOverlaps(items, bounds);
  /* SFX nudge can re-overlap balloons — slots prefer dropping chrome over illegible stacks. */
  if (placeMode === 'slots') {
    sanitizeSlotTextItems(items, bounds);
  }

  return { items };
  });
}
