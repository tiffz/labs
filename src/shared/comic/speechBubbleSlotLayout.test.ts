import { describe, expect, it } from 'vitest';

import { layoutPanelTextBlocks } from './speechBubbleLayout';
import { adaptBlocksToPanelBudget, maxDialogueBlocksForPanel } from './speechBubbleSlotLayout';
import { validateSpeechBubbleQuality } from './speechBubbleQuality';
import type { PanelTextBlock } from './types';

describe('speechBubbleSlotLayout', () => {
  it('places multi-speaker dialogue without hard overlap/tail violations', () => {
    const bounds = { x: 0, y: 0, w: 200, h: 220 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'Is that a feral sandwich?' },
      { kind: 'dialogue', characterId: 'b', content: 'Worse. It is mine.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds, {
      placeMode: 'slots',
      allowBubbleEscape: true,
    });
    const violations = validateSpeechBubbleQuality(layout, {
      bounds,
      blocks,
      characterIds: ['a', 'b'],
      allowBubbleEscape: true,
    }).filter(
      (v) =>
        v.code === 'no_overlap' ||
        v.code === 'tail_overlap' ||
        v.code === 'reading_order' ||
        v.code === 'no_character_overlap',
    );
    expect(violations).toEqual([]);
  });

  it('budgets dialogue lines for short panels', () => {
    const bounds = { x: 0, y: 0, w: 120, h: 100 };
    expect(maxDialogueBlocksForPanel(bounds)).toBeLessThanOrEqual(2);
    const adapted = adaptBlocksToPanelBudget(
      [
        { kind: 'caption', content: 'Later.' },
        { kind: 'dialogue', characterId: 'a', content: 'One' },
        { kind: 'dialogue', characterId: 'b', content: 'Two' },
        { kind: 'dialogue', characterId: 'c', content: 'Three' },
        { kind: 'sfx', content: 'POW', loudness: 'loud' },
      ],
      bounds,
    );
    const dialogue = adapted.filter((b) => b.kind === 'dialogue');
    expect(dialogue.length).toBeLessThanOrEqual(maxDialogueBlocksForPanel(bounds));
  });

  it('scales SFX font by loudness in seed layout', () => {
    const bounds = { x: 0, y: 0, w: 180, h: 200 };
    const quiet = layoutPanelTextBlocks(
      [{ kind: 'sfx', content: 'ping', loudness: 'quiet' }],
      bounds,
      { placeMode: 'slots' },
    );
    const loud = layoutPanelTextBlocks(
      [{ kind: 'sfx', content: 'THONK', loudness: 'loud' }],
      bounds,
      { placeMode: 'slots' },
    );
    const q = quiet.items.find((i) => i.kind === 'sfx')!;
    const l = loud.items.find((i) => i.kind === 'sfx')!;
    expect(q.kind).toBe('sfx');
    expect(l.kind).toBe('sfx');
    if (q.kind === 'sfx' && l.kind === 'sfx') {
      expect(q.layout.fontSize).toBeLessThan(l.layout.fontSize);
      expect(l.layout.loudness).toBe('loud');
    }
  });

  it('keeps multi-speaker tails short on tall panels', () => {
    const bounds = { x: 0, y: 0, w: 260, h: 700 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'b', content: 'We should leave panel three.' },
      { kind: 'dialogue', characterId: 'a', content: 'After I grab the metronome.' },
      { kind: 'dialogue', characterId: 'c', content: 'Both of you, no.' },
    ];
    const adapted = adaptBlocksToPanelBudget(blocks, bounds);
    const layout = layoutPanelTextBlocks(adapted, bounds, {
      placeMode: 'slots',
      allowBubbleEscape: true,
    });
    const bubbles = layout.items.filter((item) => item.kind === 'bubble');
    expect(bubbles.length).toBeGreaterThanOrEqual(2);
    for (const item of bubbles) {
      if (item.kind !== 'bubble') continue;
      const tailLen = item.layout.tailY - (item.layout.cy + item.layout.halfH);
      expect(tailLen).toBeLessThan(bounds.h * 0.38);
      expect(tailLen).toBeGreaterThan(2);
      expect(item.layout.metrics.fontSize).toBeGreaterThanOrEqual(9);
    }
  });
});
