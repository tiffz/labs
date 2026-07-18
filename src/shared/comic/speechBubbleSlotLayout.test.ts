import { describe, expect, it } from 'vitest';

import { characterMarkerLayoutBox } from './characterMarkers';
import { layoutPanelTextBlocks } from './speechBubbleLayout';
import { adaptBlocksToPanelBudget, maxDialogueBlocksForPanel } from './speechBubbleSlotLayout';
import { validateSpeechBubbleQuality } from './speechBubbleQuality';
import { sfxLayoutBBox } from './sfxLoudness';
import type { PanelTextBlock } from './types';

function boxesOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  margin = 4,
): boolean {
  return !(
    a.right + margin <= b.left ||
    b.right + margin <= a.left ||
    a.bottom + margin <= b.top ||
    b.bottom + margin <= a.top
  );
}

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

  it('drops all text on ultra-narrow strip panels instead of "…" balloons', () => {
    const bounds = { x: 0, y: 0, w: 48, h: 520 };
    expect(maxDialogueBlocksForPanel(bounds)).toBe(0);
    const adapted = adaptBlocksToPanelBudget(
      [
        { kind: 'caption', content: 'Behold: the library card' },
        { kind: 'dialogue', characterId: 'c', content: 'I can explain the spare key.' },
      ],
      bounds,
    );
    expect(adapted).toEqual([]);
    const layout = layoutPanelTextBlocks(
      [
        { kind: 'caption', content: 'Behold: the library card' },
        { kind: 'dialogue', characterId: 'c', content: 'I can explain the spare key.' },
      ],
      bounds,
      { placeMode: 'slots', allowBubbleEscape: true },
    );
    expect(layout.items).toEqual([]);
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

  it('dodges a leading SFX obstacle instead of overlapping it', () => {
    const bounds = { x: 0, y: 0, w: 200, h: 220 };
    const blocks: PanelTextBlock[] = [
      { kind: 'sfx', content: 'BOOM', loudness: 'loud' },
      { kind: 'dialogue', characterId: 'a', content: 'Did you hear that?' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds, { placeMode: 'slots' });
    const sfx = layout.items.find((item) => item.kind === 'sfx');
    const bubble = layout.items.find((item) => item.kind === 'bubble');
    expect(sfx?.kind).toBe('sfx');
    expect(bubble?.kind).toBe('bubble');
    if (sfx?.kind === 'sfx' && bubble?.kind === 'bubble') {
      const sfxBox = sfxLayoutBBox(sfx.layout);
      const bubbleBox = {
        left: bubble.layout.cx - bubble.layout.halfW,
        top: bubble.layout.cy - bubble.layout.halfH,
        right: bubble.layout.cx + bubble.layout.halfW,
        bottom: bubble.layout.cy + bubble.layout.halfH,
      };
      expect(boxesOverlap(sfxBox, bubbleBox)).toBe(false);
    }
  });

  it('keeps loud center-ish SFX off character markers', () => {
    const bounds = { x: 0, y: 0, w: 200, h: 220 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'c', content: 'Who left that open?' },
      { kind: 'sfx', content: 'FWOOSH', loudness: 'loud' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds, {
      placeMode: 'slots',
      allowBubbleEscape: true,
    });
    const sfx = layout.items.find((item) => item.kind === 'sfx');
    expect(sfx?.kind).toBe('sfx');
    if (sfx?.kind !== 'sfx') return;
    const marker = characterMarkerLayoutBox(bounds, 'c');
    const markerBox = {
      left: marker.left,
      top: marker.top,
      right: marker.right,
      bottom: marker.bottom,
    };
    expect(boxesOverlap(sfxLayoutBBox(sfx.layout), markerBox)).toBe(false);
    const characterHits = validateSpeechBubbleQuality(layout, {
      bounds,
      blocks,
      characterIds: ['c'],
      allowBubbleEscape: true,
    }).filter((v) => v.code === 'no_character_overlap');
    expect(characterHits).toEqual([]);
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

  it('never leaves caption text under a dialogue bubble on short strip panels', () => {
    const bounds = { x: 200, y: 0, w: 140, h: 95 };
    const blocks: PanelTextBlock[] = [
      { kind: 'caption', content: 'Meanwhile…' },
      { kind: 'dialogue', characterId: 'b', content: 'Why is the lunchbox humming?' },
    ];
    const adapted = adaptBlocksToPanelBudget(blocks, bounds);
    const layout = layoutPanelTextBlocks(adapted, bounds, {
      placeMode: 'slots',
      allowBubbleEscape: true,
    });
    const hard = validateSpeechBubbleQuality(layout, {
      bounds,
      blocks: adapted,
      characterIds: ['b'],
      allowBubbleEscape: true,
    }).filter((v) => v.code === 'no_overlap' || v.code === 'reading_order');
    expect(hard).toEqual([]);
    const caption = layout.items.find((item) => item.kind === 'caption');
    const bubble = layout.items.find((item) => item.kind === 'bubble');
    if (caption?.kind === 'caption' && bubble?.kind === 'bubble') {
      const captionBox = {
        left: caption.layout.x,
        top: caption.layout.y,
        right: caption.layout.x + caption.layout.width,
        bottom: caption.layout.y + caption.layout.height,
      };
      const bubbleBox = {
        left: bubble.layout.cx - bubble.layout.halfW,
        top: bubble.layout.cy - bubble.layout.halfH,
        right: bubble.layout.cx + bubble.layout.halfW,
        bottom: bubble.layout.cy + bubble.layout.halfH,
      };
      expect(boxesOverlap(captionBox, bubbleBox)).toBe(false);
    } else {
      // Budget may drop the caption on infeasible strips — dialogue must remain.
      expect(bubble?.kind).toBe('bubble');
    }
  });

  it('keeps escaped bubble bodies from spilling deep into the next strip', () => {
    const bounds = { x: 0, y: 100, w: 180, h: 90 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'This bubble should stay on its strip.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds, {
      placeMode: 'slots',
      allowBubbleEscape: true,
    });
    const bubble = layout.items.find((item) => item.kind === 'bubble');
    expect(bubble?.kind).toBe('bubble');
    if (bubble?.kind === 'bubble') {
      expect(bubble.layout.cy + bubble.layout.halfH).toBeLessThanOrEqual(bounds.y + bounds.h + 6.5);
      expect(bubble.layout.cy - bubble.layout.halfH).toBeGreaterThanOrEqual(bounds.y - 6.5);
    }
  });
});
