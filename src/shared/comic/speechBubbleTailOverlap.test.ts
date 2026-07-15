import { describe, expect, it } from 'vitest';

import { bubblesTailsOverlap, segmentsIntersect } from './speechBubbleTailOverlap';
import type { SpeechBubbleLayout } from './speechBubbleLayout';
import { BUBBLE_PADDING_STANDARD } from './speechBubblePath';

function bubble(
  partial: Partial<SpeechBubbleLayout> &
    Pick<SpeechBubbleLayout, 'cx' | 'cy' | 'halfW' | 'halfH' | 'tailX' | 'tailY'>,
): SpeechBubbleLayout {
  return {
    lines: ['Hi'],
    characterId: 'a',
    metrics: {
      halfW: partial.halfW,
      halfH: partial.halfH,
      fontSize: 11,
      lineHeight: 13,
      padX: BUBBLE_PADDING_STANDARD.padX,
      padY: BUBBLE_PADDING_STANDARD.padY,
      shape: 'ellipse',
    },
    ...partial,
  };
}

describe('speechBubbleTailOverlap', () => {
  it('detects crossing segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ),
    ).toBe(true);
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 },
        { x: 9, y: 0 },
      ),
    ).toBe(false);
  });

  it('flags crossing tails on facing speakers', () => {
    const left = bubble({
      cx: 40,
      cy: 40,
      halfW: 28,
      halfH: 16,
      tailX: 70,
      tailY: 90,
      characterId: 'a',
    });
    const right = bubble({
      cx: 110,
      cy: 40,
      halfW: 28,
      halfH: 16,
      tailX: 50,
      tailY: 90,
      characterId: 'b',
    });
    expect(bubblesTailsOverlap(left, right)).toBe(true);
  });

  it('allows separated tails', () => {
    const left = bubble({
      cx: 40,
      cy: 36,
      halfW: 24,
      halfH: 14,
      tailX: 36,
      tailY: 88,
      characterId: 'a',
    });
    const right = bubble({
      cx: 120,
      cy: 36,
      halfW: 24,
      halfH: 14,
      tailX: 124,
      tailY: 88,
      characterId: 'b',
    });
    expect(bubblesTailsOverlap(left, right)).toBe(false);
  });
});
