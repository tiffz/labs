import { characterMarkerLayoutBox } from './characterMarkers';
import { bubbleBodyBBox, charWidthForFont } from './speechBubblePath';
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
  | 'tail_inside_panel'
  | 'character_below_bubble'
  | 'no_character_overlap';

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
  const s = item.layout;
  return {
    left: s.x - s.fontSize * 0.55,
    top: s.y - s.fontSize,
    right: s.x + s.fontSize * 0.55,
    bottom: s.y,
  };
}

function boxesOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.right + MARGIN <= b.left ||
    b.right + MARGIN <= a.left ||
    a.bottom + MARGIN <= b.top ||
    b.bottom + MARGIN <= a.top
  );
}

function pointInRect(x: number, y: number, bounds: LayoutBounds, pad = 0): boolean {
  return (
    x >= bounds.x - pad &&
    x <= bounds.x + bounds.w + pad &&
    y >= bounds.y - pad &&
    y <= bounds.y + bounds.h + pad
  );
}

export function validatePanelTextLayout(
  layout: PanelTextLayout,
  _blocks: PanelTextBlock[],
  options: ValidatePanelTextLayoutOptions,
): LayoutViolation[] {
  const violations: LayoutViolation[] = [];
  const { bounds, allowBubbleEscape, characterIds = [] } = options;

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
    for (const line of b.lines) {
      if (line.length * charW > b.halfW * 2 - 8) {
        violations.push({
          code: 'text_fits_bubble',
          message: `Bubble ${i + 1} line exceeds width`,
          itemIndex: i,
        });
        break;
      }
    }

    const box = bubbleBodyBBox(b.cx, b.cy, b.halfW, b.halfH);
    if (!allowBubbleEscape) {
      if (
        box.left < bounds.x - EPS ||
        box.right > bounds.x + bounds.w + EPS ||
        box.top < bounds.y - EPS ||
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
    const marker = characterMarkerLayoutBox(bounds, characterId);
    const markerBox: BBox = {
      left: marker.left,
      top: marker.top,
      right: marker.right,
      bottom: marker.bottom,
    };
    for (let i = 0; i < layout.items.length; i++) {
      const item = layout.items[i]!;
      if (item.kind !== 'bubble') continue;
      if (boxesOverlap(itemBBox(item), markerBox)) {
        violations.push({
          code: 'no_character_overlap',
          message: `Bubble ${i + 1} overlaps character ${characterId.toUpperCase()}`,
          itemIndex: i,
        });
      }
    }
  }

  return violations;
}
