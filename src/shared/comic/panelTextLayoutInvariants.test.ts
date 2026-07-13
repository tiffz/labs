import { describe, expect, it } from 'vitest';

import { generateLayoutsForPanelCount } from './layoutGenerate';
import { panelPixelBounds } from './panelClipPath';
import { validatePanelTextLayout } from './panelTextLayoutInvariants';
import { layoutPanelTextBlocks } from './speechBubbleLayout';
import type { PanelCharacterId, PanelTextBlock } from './types';

const PAGE_W = 400;
const PAGE_H = 560;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomDialogue(rng: () => number): string {
  const words = [
    'wait',
    'why',
    'okay',
    'sure',
    'maybe',
    'definitely',
    'never',
    'always',
    'suddenly',
    'quietly',
    'loudly',
    'behind',
    'under',
    'through',
    'around',
  ];
  const count = 3 + Math.floor(rng() * 12);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(words[Math.floor(rng() * words.length)]!);
  }
  return picked.join(' ');
}

function randomBlocks(rng: () => number, maxBlocks: number): PanelTextBlock[] {
  const count = 1 + Math.floor(rng() * maxBlocks);
  const blocks: PanelTextBlock[] = [];
  const chars: PanelCharacterId[] = ['a', 'b', 'c'];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.2) {
      blocks.push({ kind: 'caption', content: randomDialogue(rng) });
    } else if (roll < 0.9) {
      blocks.push({
        kind: 'dialogue',
        characterId: chars[Math.floor(rng() * chars.length)]!,
        content: randomDialogue(rng),
      });
    } else {
      blocks.push({ kind: 'sfx', content: 'POW' });
    }
  }
  return blocks;
}

function characterIdsFromBlocks(blocks: PanelTextBlock[]): PanelCharacterId[] {
  const ids = new Set<PanelCharacterId>();
  for (const block of blocks) {
    if (block.kind === 'dialogue' && block.content.trim()) {
      ids.add(block.characterId);
    }
  }
  return [...ids];
}

describe('validatePanelTextLayout', () => {
  it('passes for a wide panel with two dialogue lines', () => {
    const bounds = { x: 10, y: 10, w: 200, h: 160 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'Hello there.' },
      { kind: 'dialogue', characterId: 'b', content: 'Hi back.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds);
    const violations = validatePanelTextLayout(layout, blocks, {
      bounds,
      characterIds: characterIdsFromBlocks(blocks),
    });
    expect(violations).toEqual([]);
  });

  it('passes for a narrow tall panel', () => {
    const bounds = { x: 0, y: 0, w: 30, h: 160 };
    const blocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'This is a lot of words in a skinny panel.' },
    ];
    const layout = layoutPanelTextBlocks(blocks, bounds);
    const violations = validatePanelTextLayout(layout, blocks, {
      bounds,
      characterIds: characterIdsFromBlocks(blocks),
    });
    expect(violations).toEqual([]);
  });

  it('passes caption-before and caption-after orderings', () => {
    const bounds = { x: 4, y: 4, w: 180, h: 140 };
    for (const blocks of [
      [
        { kind: 'caption' as const, content: 'Meanwhile…' },
        { kind: 'dialogue' as const, characterId: 'a' as const, content: 'Watch out!' },
      ],
      [
        { kind: 'dialogue' as const, characterId: 'b' as const, content: 'Done.' },
        { kind: 'caption' as const, content: 'To be continued.' },
      ],
    ]) {
      const layout = layoutPanelTextBlocks(blocks, bounds);
      const violations = validatePanelTextLayout(layout, blocks, {
        bounds,
        characterIds: characterIdsFromBlocks(blocks),
      });
      expect(violations).toEqual([]);
    }
  });
});

describe('layoutPanelTextBlocks fuzz', () => {
  it('satisfies invariants across random bounds and blocks', () => {
    const rng = seededRandom(42);
    for (let caseIndex = 0; caseIndex < 80; caseIndex++) {
      const bounds = {
        x: rng() * 20,
        y: rng() * 20,
        w: 40 + Math.floor(rng() * 360),
        h: 80 + Math.floor(rng() * 420),
      };
      const blocks = randomBlocks(rng, 4);
      const layout = layoutPanelTextBlocks(blocks, bounds);
      const violations = validatePanelTextLayout(layout, blocks, {
        bounds,
        characterIds: characterIdsFromBlocks(blocks),
      });
      expect(violations, `case ${caseIndex}: ${JSON.stringify(violations)}`).toEqual([]);
    }
  });

  it('satisfies invariants on generated layout panels', () => {
    const rng = seededRandom(9001);
    for (let panelCount = 1; panelCount <= 8; panelCount++) {
      const layouts = generateLayoutsForPanelCount(panelCount, { allowFullBleed: true });
      for (const generated of layouts) {
        for (let panelIndex = 0; panelIndex < generated.panels.length; panelIndex++) {
          const panel = generated.panels[panelIndex]!;
          const bounds = panelPixelBounds(panel, PAGE_W, PAGE_H, 2);
          if (bounds.w < 24 || bounds.h < 40) continue;
          const blocks = randomBlocks(rng, 3);
          const layout = layoutPanelTextBlocks(blocks, bounds);
          const violations = validatePanelTextLayout(layout, blocks, {
            bounds,
            characterIds: characterIdsFromBlocks(blocks),
          });
          expect(
            violations,
            `panel ${panelCount}/${generated.id}/p${panelIndex}: ${JSON.stringify(violations)}`,
          ).toEqual([]);
        }
      }
    }
  });
});
