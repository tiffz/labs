import { characterHeadPoint } from './characterMarkers';
import { clampX, maxBubbleHalfWidth, panelTextZones } from './panelTextZones';
import {
  BUBBLE_FONT_SIZE,
  bubbleMetricsForLines,
  fitDialogueLines,
  maxCharsForWidth,
  wrapDialogueText,
  type BubbleMetrics,
} from './speechBubblePath';
import type { PanelCharacterId, PanelTextBlock } from './types';

export type LayoutBounds = { x: number; y: number; w: number; h: number };

export type PanelTextLayoutOptions = {
  allowBubbleEscape?: boolean;
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
const MIN_BUBBLE_FONT = 8;
const BUBBLE_ABOVE_CHARACTER_GAP = 10;

type BBox = { left: number; top: number; right: number; bottom: number };

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
  const s = item.layout;
  return {
    left: s.x - s.fontSize * 0.55,
    top: s.y - s.fontSize,
    right: s.x + s.fontSize * 0.55,
    bottom: s.y,
  };
}

function boxesOverlap(a: BBox, b: BBox, margin = OVERLAP_MARGIN): boolean {
  return !(
    a.right + margin <= b.left ||
    b.right + margin <= a.left ||
    a.bottom + margin <= b.top ||
    b.bottom + margin <= a.top
  );
}

function blockHasContent(block: PanelTextBlock): boolean {
  return block.content.trim().length > 0;
}

function constrainBubbleVertical(
  cy: number,
  halfH: number,
  tailY: number,
  zones: ReturnType<typeof panelTextZones>,
): number {
  const maxCy = Math.min(
    zones.dialogueBottom - halfH,
    tailY - halfH - OVERLAP_MARGIN,
  );
  return Math.min(maxCy, Math.max(zones.dialogueTop + halfH, cy));
}

function bubbleCyAboveCharacter(
  tailY: number,
  halfH: number,
  zones: ReturnType<typeof panelTextZones>,
): number {
  return constrainBubbleVertical(
    tailY - halfH - BUBBLE_ABOVE_CHARACTER_GAP,
    halfH,
    tailY,
    zones,
  );
}

function stackItemsVertically(
  items: PanelTextLayoutItem[],
  zones: ReturnType<typeof panelTextZones>,
): boolean {
  let textCursor = zones.dialogueTop;
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
      const reservedBelow = spaceNeededBelow(items, i, zones);
      const charStack = bubbleBottomByCharacter.get(item.layout.characterId);
      const minTop = Math.max(textCursor, charStack ?? textCursor);
      const anchoredTop = item.layout.tailY - item.layout.halfH * 2 - BUBBLE_ABOVE_CHARACTER_GAP;
      const top = Math.max(minTop, anchoredTop);
      let cy = top + item.layout.halfH;
      const maxCy = Math.min(
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

function spaceNeededBelow(
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
): void {
  if (items.length === 0) return;
  const activeBlocks = blocks.filter(blockHasContent);
  const maxHalfW = maxBubbleHalfWidth(bounds, zones.sidePad);
  const innerWidth = bounds.w - zones.sidePad * 2;
  let fontCap = BUBBLE_FONT_SIZE;
  let lineCap = 6;

  for (let attempt = 0; attempt < 32; attempt++) {
    const snapshot = items.map((item) => structuredClone(item));

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const block = activeBlocks[i];
      if (!block) continue;

      if (item.kind === 'bubble' && block.kind === 'dialogue') {
        const { lines, metrics } = fitDialogueLines(
          block.content,
          maxHalfW,
          innerWidth,
          fontCap,
          lineCap,
        );
        item.layout.lines = lines;
        item.layout.metrics = metrics;
        item.layout.halfW = metrics.halfW;
        item.layout.halfH = metrics.halfH;
        item.layout.cx = clampX(item.layout.tailX, metrics.halfW, bounds, zones.sidePad);
      } else if (item.kind === 'caption' && block.kind === 'caption') {
        const lines = wrapCaption(block.content, Math.min(42, maxCharsForWidth(innerWidth, fontCap)));
        const capped = lines.slice(0, lineCap);
        const box = captionBox(capped, bounds);
        item.layout.lines = capped;
        item.layout.width = Math.min(box.width, bounds.w - zones.sidePad * 2 - 4);
        item.layout.height = box.height;
      } else if (item.kind === 'sfx' && block.kind === 'sfx') {
        item.layout.fontSize = Math.max(MIN_BUBBLE_FONT, Math.min(fontCap + 2, bounds.w * 0.1));
        item.layout.text = block.content.slice(0, 14);
      }
    }

    if (stackItemsVertically(items, zones)) {
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

  applyMinimalStackFit(items, activeBlocks, bounds, zones, maxHalfW, innerWidth);
}

function applyMinimalStackFit(
  items: PanelTextLayoutItem[],
  activeBlocks: PanelTextBlock[],
  bounds: LayoutBounds,
  zones: ReturnType<typeof panelTextZones>,
  maxHalfW: number,
  innerWidth: number,
): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const block = activeBlocks[i];
    if (!block) continue;
    if (item.kind === 'bubble' && block.kind === 'dialogue') {
      const { lines, metrics } = fitDialogueLines(block.content, maxHalfW, innerWidth, MIN_BUBBLE_FONT, 1);
      item.layout.lines = lines;
      item.layout.metrics = metrics;
      item.layout.halfW = metrics.halfW;
      item.layout.halfH = metrics.halfH;
      item.layout.cx = clampX(item.layout.tailX, metrics.halfW, bounds, zones.sidePad);
    } else if (item.kind === 'caption' && block.kind === 'caption') {
      const lines = wrapCaption(block.content, maxCharsForWidth(innerWidth, MIN_BUBBLE_FONT)).slice(0, 1);
      const box = captionBox(lines, bounds);
      item.layout.lines = lines;
      item.layout.width = Math.min(box.width, bounds.w - zones.sidePad * 2 - 4);
      item.layout.height = box.height;
    } else if (item.kind === 'sfx' && block.kind === 'sfx') {
      item.layout.fontSize = MIN_BUBBLE_FONT;
      item.layout.text = block.content.slice(0, 6);
    }
  }

  while (items.length > 0) {
    if (stackItemsVertically(items, zones)) {
      resolveBubblePairOverlaps(items, zones);
      if (!stackHasOverlaps(items)) return;
    }
    items.pop();
  }
}

function enforceBubbleTailGap(items: PanelTextLayoutItem[]): void {
  for (const item of items) {
    if (item.kind !== 'bubble') continue;
    const maxCy = item.layout.tailY - item.layout.halfH - OVERLAP_MARGIN;
    item.layout.cy = Math.min(item.layout.cy, maxCy);
  }
}

/**
 * Place captions, dialogue bubbles, and SFX in reading order with zoned layout.
 */
export function layoutPanelTextBlocks(
  blocks: PanelTextBlock[],
  bounds: LayoutBounds,
  options?: PanelTextLayoutOptions,
): PanelTextLayout {
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
      const { lines: wrapped, metrics } = fitDialogueLines(block.content, maxHalfW, innerWidth);
      const head = characterHeadPoint(bounds, block.characterId);
      const tailX = head.x;
      const tailY = head.y;
      const preferredCx = clampX(tailX, metrics.halfW, bounds, zones.sidePad);
      const cy = bubbleCyAboveCharacter(tailY, metrics.halfH, zones);

      const bubble: SpeechBubbleLayout = {
        cx: preferredCx,
        cy,
        halfW: metrics.halfW,
        halfH: metrics.halfH,
        tailX,
        tailY,
        lines: wrapped,
        characterId: block.characterId,
        metrics,
      };
      items.push({ kind: 'bubble', layout: bubble });
      cursorY = Math.min(cursorY, bubble.cy - metrics.halfH - BLOCK_GAP);
      continue;
    }

    if (block.kind === 'sfx') {
      const fontSize = Math.max(12, Math.min(22, bounds.w * 0.12));
      const layout: SfxLayout = {
        x: bounds.x + bounds.w * 0.5,
        y: cursorY + fontSize,
        fontSize,
        text: block.content.slice(0, 14),
      };
      items.push({ kind: 'sfx', layout });
      cursorY += fontSize + BLOCK_GAP;
    }
  }

  compressStackToDialogueBand(items, blocks, bounds, zones);
  enforceBubbleTailGap(items);
  resolveBubblePairOverlaps(items, zones);

  if (!options?.allowBubbleEscape) {
    for (const item of items) {
      if (item.kind !== 'bubble') continue;
      item.layout.cx = clampX(item.layout.cx, item.layout.halfW, bounds, zones.sidePad);
    }
  }

  return { items };
}
