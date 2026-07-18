import { characterMarkerBox, characterMarkerLayoutBox } from './characterMarkers';
import { sfxLayoutBBox } from './sfxLoudness';
import {
  bubbleBodyBBox,
  bubbleTextBlockHeight,
  bubbleTextOffsetY,
  charWidthForFont,
} from './speechBubblePath';
import type { SpeechBubbleLayout } from './speechBubbleLayout';
import type {
  PanelTextLayout,
  PanelTextLayoutItem,
  PanelTextLayoutOptions,
  LayoutBounds,
} from './speechBubbleLayout';
import type { PanelCharacterId, PanelTextBlock } from './types';

export type LayoutViolationCode =
  | 'reading_order'
  | 'no_overlap'
  | 'text_fits_bubble'
  | 'bubble_in_bounds'
  | 'bubble_above_panel'
  | 'tail_inside_panel'
  | 'character_below_bubble'
  | 'text_outside_panel'
  | 'no_character_overlap'
  | 'character_in_panel';

export type LayoutViolation = {
  code: LayoutViolationCode;
  message: string;
  itemIndex?: number;
};

export type ValidatePanelTextLayoutOptions = PanelTextLayoutOptions & {
  bounds: LayoutBounds;
  characterIds?: PanelCharacterId[];
};

type BBox = { left: number; top: number; right: number; bottom: number };

const EPS = 1.5;
const MARGIN = 4;

function itemBBox(item: PanelTextLayoutItem): BBox {
  if (item.kind === 'caption') {
    const c = item.layout;
    return { left: c.x, top: c.y, right: c.x + c.width, bottom: c.y + c.height };
  }
  if (item.kind === 'bubble') {
    return bubbleBodyBBox(item.layout.cx, item.layout.cy, item.layout.halfW, item.layout.halfH);
  }
  return sfxLayoutBBox(item.layout);
}

function boxesOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.right + MARGIN <= b.left ||
    b.right + MARGIN <= a.left ||
    a.bottom + MARGIN <= b.top ||
    b.bottom + MARGIN <= a.top
  );
}

/**
 * Axis-aligned dialogue text region used for escape/readability checks.
 * Must match PanelMockupSvg: top-anchored inside the pad box (not cy-centered).
 */
export function bubbleTextBBox(bubble: SpeechBubbleLayout): BBox {
  const offsetY = bubbleTextOffsetY(
    bubble.cx,
    bubble.cy,
    bubble.halfW,
    bubble.halfH,
    bubble.tailX,
    bubble.tailY,
    bubble.metrics.shape,
    bubble.metrics.padY,
    bubble.metrics.fontSize,
  );
  /* First line: dominantBaseline="middle" at this y (see PanelMockupSvg). */
  const firstLineCenterY =
    bubble.cy -
    bubble.halfH +
    bubble.metrics.padY +
    bubble.metrics.fontSize * 0.5 +
    offsetY;
  const textH = bubbleTextBlockHeight(
    bubble.lines.length,
    bubble.metrics.lineHeight,
    bubble.metrics.fontSize,
  );
  const charW = charWidthForFont(bubble.metrics.fontSize);
  const maxLineChars = Math.max(...bubble.lines.map((line) => line.length), 1);
  const textW = maxLineChars * charW;
  const visualTop = firstLineCenterY - bubble.metrics.fontSize * 0.5;
  return {
    left: bubble.cx - textW / 2 - bubble.metrics.padX * 0.25,
    top: visualTop,
    right: bubble.cx + textW / 2 + bubble.metrics.padX * 0.25,
    bottom: visualTop + textH,
  };
}

function pointInRect(x: number, y: number, bounds: LayoutBounds, pad = 0): boolean {
  return (
    x >= bounds.x - pad &&
    x <= bounds.x + bounds.w + pad &&
    y >= bounds.y - pad &&
    y <= bounds.y + bounds.h + pad
  );
}

function textInsidePanel(textBox: BBox, bounds: LayoutBounds): boolean {
  return (
    textBox.left >= bounds.x - EPS &&
    textBox.right <= bounds.x + bounds.w + EPS &&
    textBox.top >= bounds.y - EPS &&
    textBox.bottom <= bounds.y + bounds.h + EPS
  );
}

export function validatePanelTextLayout(
  layout: PanelTextLayout,
  _blocks: PanelTextBlock[],
  options: ValidatePanelTextLayoutOptions,
): LayoutViolation[] {
  const violations: LayoutViolation[] = [];
  const { bounds, allowBubbleEscape, characterIds = [], markerPlacement } = options;

  for (let i = 0; i < layout.items.length - 1; i++) {
    const a = itemBBox(layout.items[i]!);
    const b = itemBBox(layout.items[i + 1]!);
    if (!boxesOverlap(a, b)) continue;
    if (a.bottom > b.top + EPS) {
      violations.push({
        code: 'reading_order',
        message: `Item ${i + 1} overlaps reading order with item ${i + 2}`,
        itemIndex: i + 1,
      });
    }
  }

  for (let i = 0; i < layout.items.length; i++) {
    for (let j = i + 1; j < layout.items.length; j++) {
      if (boxesOverlap(itemBBox(layout.items[i]!), itemBBox(layout.items[j]!))) {
        violations.push({
          code: 'no_overlap',
          message: `Items ${i + 1} and ${j + 1} overlap`,
          itemIndex: j,
        });
      }
    }
  }

  for (let i = 0; i < layout.items.length; i++) {
    const item = layout.items[i]!;
    if (item.kind !== 'bubble') continue;
    const b = item.layout;
    const charW = charWidthForFont(b.metrics.fontSize);
    const innerW = b.halfW * 2 - b.metrics.padX * 2;
    for (const line of b.lines) {
      if (line.length * charW > innerW + 1) {
        violations.push({
          code: 'text_fits_bubble',
          message: `Bubble ${i + 1} line exceeds width`,
          itemIndex: i,
        });
        break;
      }
    }

    const box = bubbleBodyBBox(b.cx, b.cy, b.halfW, b.halfH);
    /* Upward escape clips text under panel strokes / previous gutters — always hard. */
    if (box.top < bounds.y - EPS) {
      violations.push({
        code: 'bubble_above_panel',
        message: `Bubble ${i + 1} extends above panel (dialogue would clip)`,
        itemIndex: i,
      });
    }
    if (!allowBubbleEscape) {
      if (
        box.left < bounds.x - EPS ||
        box.right > bounds.x + bounds.w + EPS ||
        box.bottom > bounds.y + bounds.h + EPS
      ) {
        violations.push({
          code: 'bubble_in_bounds',
          message: `Bubble ${i + 1} extends outside panel`,
          itemIndex: i,
        });
      }
    } else if (box.bottom > bounds.y + bounds.h + EPS) {
      violations.push({
        code: 'bubble_in_bounds',
        message: `Bubble ${i + 1} extends below panel`,
        itemIndex: i,
      });
    }

    if (!textInsidePanel(bubbleTextBBox(b), bounds)) {
      violations.push({
        code: 'text_outside_panel',
        message: `Bubble ${i + 1} dialogue extends outside panel`,
        itemIndex: i,
      });
    }

    if (!pointInRect(b.tailX, b.tailY, bounds, 2)) {
      violations.push({
        code: 'tail_inside_panel',
        message: `Bubble ${i + 1} tail outside panel`,
        itemIndex: i,
      });
    }

    const bubbleBottom = b.cy + b.halfH;
    if (bubbleBottom > b.tailY - MARGIN) {
      violations.push({
        code: 'character_below_bubble',
        message: `Bubble ${i + 1} intrudes on character band`,
        itemIndex: i,
      });
    }
  }

  for (const characterId of characterIds) {
    const marker = characterMarkerLayoutBox(bounds, characterId, markerPlacement);
    const markerBox: BBox = {
      left: marker.left,
      top: marker.top,
      right: marker.right,
      bottom: marker.bottom,
    };
    /* Painted marker (tighter than overlap clearance box) must stay mostly in-panel. */
    const painted = characterMarkerBox(bounds, characterId, markerPlacement);
    const paintSlop = Math.max(4, painted.size * 0.35);
    if (
      !pointInRect(painted.cx, painted.cy, bounds, 0) ||
      painted.top < bounds.y - paintSlop ||
      painted.bottom > bounds.y + bounds.h + paintSlop ||
      painted.left < bounds.x - paintSlop ||
      painted.right > bounds.x + bounds.w + paintSlop
    ) {
      violations.push({
        code: 'character_in_panel',
        message: `Character ${characterId.toUpperCase()} is not visibly inside the panel`,
      });
    }
    for (let i = 0; i < layout.items.length; i++) {
      const item = layout.items[i]!;
      if (item.kind !== 'bubble' && item.kind !== 'sfx') continue;
      if (boxesOverlap(itemBBox(item), markerBox)) {
        violations.push({
          code: 'no_character_overlap',
          message: `${item.kind === 'sfx' ? 'SFX' : 'Bubble'} ${i + 1} overlaps character ${characterId.toUpperCase()}`,
          itemIndex: i,
        });
      }
    }
  }

  return violations;
}
