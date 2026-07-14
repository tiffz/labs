import { describe, expect, it } from 'vitest';

import { placeBubblesWithForce } from './speechBubbleForceLayout';
import { layoutPanelTextBlocks, type SpeechBubbleLayout } from './speechBubbleLayout';
import type { PanelTextBlock } from './types';

const BOUNDS = { x: 0, y: 0, w: 220, h: 180 };

function boxesOverlap(
  a: { cx: number; cy: number; halfW: number; halfH: number },
  b: { cx: number; cy: number; halfW: number; halfH: number },
  margin = 4,
): boolean {
  return !(
    a.cx + a.halfW + margin <= b.cx - b.halfW ||
    b.cx + b.halfW + margin <= a.cx - a.halfW ||
    a.cy + a.halfH + margin <= b.cy - b.halfH ||
    b.cy + b.halfH + margin <= a.cy - a.halfH
  );
}

function seedBubble(
  characterId: SpeechBubbleLayout['characterId'],
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tailX: number,
  tailY: number,
): SpeechBubbleLayout {
  return {
    cx,
    cy,
    halfW,
    halfH,
    tailX,
    tailY,
    lines: ['Hi'],
    characterId,
    metrics: {
      fontSize: 11,
      lineHeight: 14,
      padX: 8,
      padY: 6,
      halfW,
      halfH,
      shape: 'ellipse',
    },
  };
}

describe('placeBubblesWithForce', () => {
  it('keeps A left of B after fixed ticks', () => {
    const bubbles = [
      seedBubble('a', 60, 50, 40, 22, 55, 140),
      seedBubble('b', 160, 50, 40, 22, 165, 140),
    ];
    placeBubblesWithForce(bubbles, { bounds: BOUNDS });
    expect(bubbles[0]!.cx).toBeLessThan(bubbles[1]!.cx);
  });

  it('resolves overlap for same-band multi-speaker bubbles', () => {
    const wide = { x: 0, y: 0, w: 320, h: 200 };
    const bubbles = [
      seedBubble('a', 90, 55, 36, 20, 80, 160),
      seedBubble('b', 230, 55, 36, 20, 240, 160),
      seedBubble('c', 160, 50, 32, 18, 160, 168),
    ];
    placeBubblesWithForce(bubbles, { bounds: wide, ticks: 100 });
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        expect(boxesOverlap(bubbles[i]!, bubbles[j]!)).toBe(false);
      }
    }
  });

  it('is deterministic for the same inputs', () => {
    const make = (): SpeechBubbleLayout[] => [
      seedBubble('a', 70, 55, 42, 24, 55, 145),
      seedBubble('b', 150, 55, 42, 24, 165, 145),
    ];
    const first = make();
    const second = make();
    placeBubblesWithForce(first, { bounds: BOUNDS, ticks: 80 });
    placeBubblesWithForce(second, { bounds: BOUNDS, ticks: 80 });
    expect(first[0]!.cx).toBeCloseTo(second[0]!.cx, 5);
    expect(first[0]!.cy).toBeCloseTo(second[0]!.cy, 5);
    expect(first[1]!.cx).toBeCloseTo(second[1]!.cx, 5);
    expect(first[1]!.cy).toBeCloseTo(second[1]!.cy, 5);
  });

  it('keeps bubbles above their character tail anchors', () => {
    const bubbles = [seedBubble('a', 70, 80, 40, 22, 55, 145)];
    placeBubblesWithForce(bubbles, { bounds: BOUNDS });
    expect(bubbles[0]!.cy + bubbles[0]!.halfH).toBeLessThan(bubbles[0]!.tailY - 2);
  });
});

describe('layoutPanelTextBlocks force mode', () => {
  it('defaults to force placement without overlaps for two speakers', () => {
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'After I grab the ladder.' },
      { kind: 'dialogue', characterId: 'b', content: 'Both of you, no.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, BOUNDS);
    const bubbles = layout.items
      .filter((item) => item.kind === 'bubble')
      .map((item) => item.layout);
    expect(bubbles).toHaveLength(2);
    expect(boxesOverlap(bubbles[0]!, bubbles[1]!)).toBe(false);
  });

  it('resolves overlap for three-speaker exchange in a dense panel', () => {
    const dense = { x: 10, y: 10, w: 160, h: 200 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'b', content: 'We should leave now.' },
      { kind: 'dialogue', characterId: 'a', content: 'After I grab the ladder.' },
      { kind: 'dialogue', characterId: 'c', content: 'Both of you, no.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, dense, { allowBubbleEscape: true });
    const bubbles = layout.items
      .filter((item) => item.kind === 'bubble')
      .map((item) => item.layout);
    expect(bubbles).toHaveLength(3);
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        expect(boxesOverlap(bubbles[i]!, bubbles[j]!)).toBe(false);
      }
    }
  });

  it('keeps caption + two-speaker exchange free of overlap', () => {
    const bounds = { x: 0, y: 0, w: 280, h: 320 };
    const blocks: PanelTextBlock[] = [
      { kind: 'caption', content: 'Behold: the library card.' },
      { kind: 'dialogue', characterId: 'c', content: 'Who invited the rubber chicken?' },
      { kind: 'dialogue', characterId: 'a', content: 'It followed us from nowhere useful.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds);
    const bubbles = layout.items
      .filter((item) => item.kind === 'bubble')
      .map((item) => item.layout);
    expect(bubbles).toHaveLength(2);
    expect(boxesOverlap(bubbles[0]!, bubbles[1]!)).toBe(false);

    const caption = layout.items.find((item) => item.kind === 'caption');
    expect(caption?.kind).toBe('caption');
    if (caption?.kind === 'caption') {
      for (const bubble of bubbles) {
        const captionBox = {
          cx: caption.layout.x + caption.layout.width / 2,
          cy: caption.layout.y + caption.layout.height / 2,
          halfW: caption.layout.width / 2,
          halfH: caption.layout.height / 2,
        };
        expect(boxesOverlap(captionBox, bubble)).toBe(false);
      }
    }
  });
});
