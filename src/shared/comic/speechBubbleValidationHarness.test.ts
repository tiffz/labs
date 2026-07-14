import { describe, expect, it } from 'vitest';

import { layoutPanelTextBlocks } from './speechBubbleLayout';
import { validateSpeechBubbleGeometry } from './speechBubblePathGeometry';
import { validateSpeechBubbleQuality } from './speechBubbleQuality';
import {
  buildDefaultBubbleQualityCases,
  formatBubbleQualityMatrixReport,
  runBubbleQualityMatrix,
  STRESS_DIALOGUE_BLOCK_SETS,
} from './speechBubbleValidationHarness';
import type { PanelCharacterId, PanelTextBlock } from './types';

function characterIdsFromBlocks(blocks: PanelTextBlock[]): PanelCharacterId[] {
  const ids = new Set<PanelCharacterId>();
  for (const block of blocks) {
    if (block.kind === 'dialogue' && block.content.trim()) {
      ids.add(block.characterId);
    }
  }
  return [...ids];
}

describe('speechBubbleValidationHarness', () => {
  // Heavy matrix (~3s alone); allow headroom under full parallel test:fast load.
  it('runs the default layout matrix with zero hard failures', { timeout: 60_000 }, () => {
    const report = runBubbleQualityMatrix();
    expect(report.total).toBeGreaterThan(200);
    if (report.failed > 0) {
      throw new Error(formatBubbleQualityMatrixReport(report));
    }
  });

  it('validates path geometry for every bubble in the matrix sample', () => {
    const cases = buildDefaultBubbleQualityCases().slice(0, 48);
    for (const testCase of cases) {
      const layout = layoutPanelTextBlocks(testCase.blocks, testCase.bounds, testCase.options);
      for (const item of layout.items) {
        if (item.kind !== 'bubble') continue;
        const geometryViolations = validateSpeechBubbleGeometry(item.layout);
        expect(
          geometryViolations,
          `${testCase.label}: ${geometryViolations.map((v) => v.code).join(', ')}`,
        ).toEqual([]);
      }
    }
  });

  it('covers all stress dialogue block sets on a hand-sized panel', () => {
    const bounds = { x: 0, y: 0, w: 200, h: 220 };
    for (let i = 0; i < STRESS_DIALOGUE_BLOCK_SETS.length; i++) {
      const blocks = STRESS_DIALOGUE_BLOCK_SETS[i]!;
      const layout = layoutPanelTextBlocks(blocks, bounds);
      const violations = validateSpeechBubbleQuality(layout, {
        bounds,
        blocks,
        characterIds: characterIdsFromBlocks(blocks),
      });
      const hard = violations.filter(
        (v) => v.code !== 'no_overlap' && v.code !== 'reading_order' && v.code !== 'bubble_in_bounds',
      );
      expect(hard, `stress set ${i}`).toEqual([]);
    }
  });

  it('reports skipped infeasible micro-panels separately from failures', () => {
    const report = runBubbleQualityMatrix({
      cases: [
        {
          label: 'tiny',
          bounds: { x: 0, y: 0, w: 40, h: 50 },
          blocks: STRESS_DIALOGUE_BLOCK_SETS[2]!,
        },
      ],
      skipInfeasible: true,
    });
    expect(report.skipped).toBe(1);
    expect(report.failed).toBe(0);
  });
});
