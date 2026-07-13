import { describe, expect, it } from 'vitest';

import { layoutPanelTextBlocks } from './speechBubbleLayout';
import type { PanelTextBlock } from './types';

const BOUNDS = { x: 0, y: 0, w: 200, h: 160 };

function bubbleItems(layout: ReturnType<typeof layoutPanelTextBlocks>) {
  return layout.items.filter((item) => item.kind === 'bubble').map((item) => item.layout);
}

function captionItems(layout: ReturnType<typeof layoutPanelTextBlocks>) {
  return layout.items.filter((item) => item.kind === 'caption').map((item) => item.layout);
}

describe('layoutPanelTextBlocks', () => {
  it('places character A left and character B right', () => {
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'Hello there.' },
      { kind: 'dialogue', characterId: 'b', content: 'Hi back.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, BOUNDS);
    const bubbles = bubbleItems(layout);
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0]!.cx).toBeLessThan(bubbles[1]!.cx);
    expect(bubbles[0]!.halfW).toBeGreaterThan(20);
  });

  it('follows blocks array order top-to-bottom', () => {
    const blocks: PanelTextBlock[] = [
      { kind: 'caption', content: 'Meanwhile…' },
      { kind: 'dialogue', characterId: 'a', content: 'Watch out!' },
    ];
    const layout = layoutPanelTextBlocks(blocks, BOUNDS);
    expect(layout.items).toHaveLength(2);
    expect(layout.items[0]!.kind).toBe('caption');
    expect(layout.items[1]!.kind).toBe('bubble');
    const caption = captionItems(layout)[0]!;
    const bubble = bubbleItems(layout)[0]!;
    expect(caption.y).toBeLessThan(bubble.cy);
  });

  it('places later caption below earlier dialogue when ordered that way', () => {
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'Done.' },
      { kind: 'caption', content: 'To be continued.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, BOUNDS);
    expect(layout.items[0]!.kind).toBe('bubble');
    expect(layout.items[1]!.kind).toBe('caption');
    const bubble = bubbleItems(layout)[0]!;
    const caption = captionItems(layout)[0]!;
    expect(caption.y).toBeGreaterThan(bubble.cy);
  });
});
