import { describe, expect, it } from 'vitest';

import { generateLayoutsForPanelCount } from './layoutGenerate';
import { panelPixelBounds } from './panelClipPath';
import { panelTextZones } from './panelTextZones';
import { layoutPanelTextBlocks } from './speechBubbleLayout';
import {
  DEFAULT_BUBBLE_QUALITY_THRESHOLDS,
  formatBubbleQualityReport,
  validateSpeechBubbleQuality,
} from './speechBubbleQuality';
import type { PanelCharacterId, PanelTextBlock } from './types';

const PAGE_W = 524;
const PAGE_H = 810;

function characterIdsFromBlocks(blocks: PanelTextBlock[]): PanelCharacterId[] {
  const ids = new Set<PanelCharacterId>();
  for (const block of blocks) {
    if (block.kind === 'dialogue' && block.content.trim()) {
      ids.add(block.characterId);
    }
  }
  return [...ids];
}

function minDialogueZoneForBlocks(blocks: PanelTextBlock[]): number {
  const active = blocks.filter((block) => block.content.trim().length > 0).length;
  return active * 32;
}

function assertQuality(
  label: string,
  blocks: PanelTextBlock[],
  bounds: { x: number; y: number; w: number; h: number },
): void {
  const zones = panelTextZones(bounds);
  if (zones.dialogueBottom - zones.dialogueTop < minDialogueZoneForBlocks(blocks)) {
    return;
  }
  const layout = layoutPanelTextBlocks(blocks, bounds);
  const violations = validateSpeechBubbleQuality(layout, {
    bounds,
    blocks,
    characterIds: characterIdsFromBlocks(blocks),
  });
  const hardViolations = violations.filter(
    (violation) =>
      violation.code !== 'no_overlap' &&
      violation.code !== 'reading_order' &&
      violation.code !== 'bubble_in_bounds',
  );
  expect(hardViolations, `${label}: ${formatBubbleQualityReport(violations)}`).toEqual([]);
}

const MAD_LIBS_PANEL_BLOCKS: PanelTextBlock[][] = [
  [
    { kind: 'caption', content: 'Some time later.' },
    { kind: 'dialogue', characterId: 'c', content: 'Who invited the goose?' },
    { kind: 'dialogue', characterId: 'c', content: 'It followed us from the supply closet.' },
  ],
  [
    { kind: 'dialogue', characterId: 'a', content: 'Is that a suspicious submarine?' },
    { kind: 'dialogue', characterId: 'b', content: 'Worse. It is mine.' },
  ],
  [
    { kind: 'caption', content: 'Meanwhile, near the supply closet…' },
    { kind: 'dialogue', characterId: 'b', content: 'We should leave the parking lot.' },
    { kind: 'dialogue', characterId: 'a', content: 'After I grab the metronome.' },
    { kind: 'dialogue', characterId: 'c', content: 'Both of you, no.' },
  ],
  [
    { kind: 'dialogue', characterId: 'a', content: 'Okay but why is there a haunted accordion in panel three?' },
  ],
];

describe('speechBubbleQuality benchmarks', () => {
  it('documents default thresholds for readable bubbles', () => {
    expect(DEFAULT_BUBBLE_QUALITY_THRESHOLDS.minAspect).toBeGreaterThan(0.2);
    expect(DEFAULT_BUBBLE_QUALITY_THRESHOLDS.maxAspect).toBeLessThan(1.2);
    expect(DEFAULT_BUBBLE_QUALITY_THRESHOLDS.minAvgCharsMultiLine).toBeGreaterThan(2);
  });

  it('passes caption + same-character exchange on a medium panel', () => {
    const blocks: PanelTextBlock[] = [
      { kind: 'caption', content: 'Some time later.' },
      { kind: 'dialogue', characterId: 'c', content: 'Who invited the goose?' },
      { kind: 'dialogue', characterId: 'c', content: 'It followed us from the supply closet.' },
    ];
    assertQuality('medium exchange', blocks, { x: 0, y: 0, w: 180, h: 200 });
  });

  it('passes dense caption plus three-speaker exchange on a tall panel', () => {
    assertQuality('dense exchange', MAD_LIBS_PANEL_BLOCKS[2]!, { x: 0, y: 0, w: 200, h: 320 });
  });

  it('passes scrapboard-style exchanges on 9-up mosaic cells', () => {
    const layouts = generateLayoutsForPanelCount(9, { allowFullBleed: true });
    const mosaic = layouts.find((layout) => layout.id.startsWith('mosaic-'));
    expect(mosaic).toBeDefined();

    for (let panelIndex = 0; panelIndex < mosaic!.panels.length; panelIndex++) {
      const bounds = panelPixelBounds(mosaic!.panels[panelIndex]!, PAGE_W, PAGE_H, 2);
      for (let blockSet = 0; blockSet < MAD_LIBS_PANEL_BLOCKS.length; blockSet++) {
        const blocks = MAD_LIBS_PANEL_BLOCKS[blockSet]!;
        assertQuality(`mosaic panel=${panelIndex} blocks=${blockSet}`, blocks, bounds);
      }
    }
  });

  it('passes dense two-column 10-up grid cells with multi-speaker dialogue', () => {
    const layouts = generateLayoutsForPanelCount(10, { allowFullBleed: true });
    const grid = layouts.find((layout) => layout.id.startsWith('grid-2x5'));
    expect(grid).toBeDefined();

    const denseBlocks: PanelTextBlock[] = [
      { kind: 'dialogue', characterId: 'a', content: 'I told you not to bring the traffic cone.' },
      { kind: 'dialogue', characterId: 'b', content: 'We are absolutely not discussing the haunted accordion.' },
    ];

    for (let panelIndex = 0; panelIndex < grid!.panels.length; panelIndex++) {
      const bounds = panelPixelBounds(grid!.panels[panelIndex]!, PAGE_W, PAGE_H, 2);
      assertQuality(`10-up panel=${panelIndex}`, denseBlocks, bounds);
    }
  });

  it('passes random dialogue fuzz under quality rules', () => {
    let state = 77 >>> 0;
    const rng = (): number => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };

    for (let caseIndex = 0; caseIndex < 100; caseIndex++) {
      const bounds = {
        x: rng() * 8,
        y: rng() * 8,
        w: 48 + Math.floor(rng() * 220),
        h: 72 + Math.floor(rng() * 260),
      };
      const blockCount = 1 + Math.floor(rng() * 4);
      const blocks: PanelTextBlock[] = [];
      for (let i = 0; i < blockCount; i++) {
        const roll = rng();
        if (roll < 0.25) {
          blocks.push({ kind: 'caption', content: 'Meanwhile near the supply closet…' });
        } else {
          blocks.push({
            kind: 'dialogue',
            characterId: (['a', 'b', 'c'] as PanelCharacterId[])[Math.floor(rng() * 3)]!,
            content: 'Who invited the suspicious goose into the supply closet?',
          });
        }
      }
      assertQuality(`fuzz case ${caseIndex}`, blocks, bounds);
    }
  });
});
