/**
 * Batch runner for speech-bubble layout + quality validation.
 *
 * Used by Vitest matrix tests and `npm run test:bubble-quality`.
 */

import { generateLayoutsForPanelCount } from './layoutGenerate';
import { panelPixelBounds } from './panelClipPath';
import { maxBubbleHalfWidth, panelTextZones } from './panelTextZones';
import { layoutPanelTextBlocks, type LayoutBounds, type PanelTextLayoutOptions } from './speechBubbleLayout';
import {
  formatBubbleQualityReport,
  validateSpeechBubbleQuality,
  type BubbleQualityViolation,
  type BubbleQualityViolationCode,
} from './speechBubbleQuality';
import { adaptBlocksToPanelBudget } from './speechBubbleSlotLayout';
import type { PanelCharacterId, PanelTextBlock } from './types';

/**
 * Soft only when body may overhang with Bubble escape.
 * Overlap, reading order, and tail_overlap are hard product rules (~98% bar).
 */
export const BUBBLE_QUALITY_SOFT_VIOLATIONS: ReadonlySet<BubbleQualityViolationCode> = new Set([
  'bubble_in_bounds',
  // Intentional content reduction when a panel cannot host every line cleanly.
  'blocks_dropped',
]);

export type BubbleQualityCase = {
  label: string;
  bounds: LayoutBounds;
  blocks: PanelTextBlock[];
  options?: PanelTextLayoutOptions;
  characterIds?: PanelCharacterId[];
};

export type BubbleQualityCaseResult = {
  label: string;
  bounds: LayoutBounds;
  blocks: PanelTextBlock[];
  violations: BubbleQualityViolation[];
  skipped: boolean;
  skipReason?: string;
};

export type BubbleQualityMatrixReport = {
  total: number;
  passed: number;
  skipped: number;
  failed: number;
  failures: BubbleQualityCaseResult[];
};

export type RunBubbleQualityMatrixOptions = {
  cases?: BubbleQualityCase[];
  /** Skip infeasible panels (dialogue zone too short for block count). */
  skipInfeasible?: boolean;
  minDialogueHeightPerBlock?: number;
  softViolations?: ReadonlySet<BubbleQualityViolationCode>;
  pageWidth?: number;
  pageHeight?: number;
  pageMargin?: number;
};

const DEFAULT_PAGE_W = 524;
const DEFAULT_PAGE_H = 810;
const DEFAULT_PAGE_MARGIN = 2;

function activeBlockCount(blocks: PanelTextBlock[]): number {
  return blocks.filter((block) => block.content.trim().length > 0).length;
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

function isInfeasible(
  bounds: LayoutBounds,
  blocks: PanelTextBlock[],
  minHeightPerBlock: number,
): boolean {
  const zones = panelTextZones(bounds);
  const zoneHeight = zones.dialogueBottom - zones.dialogueTop;
  const active = activeBlockCount(blocks);
  if (zoneHeight < active * minHeightPerBlock) return true;
  if (bounds.h < 92 && bounds.h / Math.max(bounds.w, 1) < 0.25) return true;
  return false;
}

function filterViolations(
  violations: BubbleQualityViolation[],
  soft: ReadonlySet<BubbleQualityViolationCode>,
): BubbleQualityViolation[] {
  return violations.filter((violation) => !soft.has(violation.code));
}

/** Run layout + validateSpeechBubbleQuality for each case. */
export function runBubbleQualityMatrix(
  options: RunBubbleQualityMatrixOptions = {},
): BubbleQualityMatrixReport {
  const cases = options.cases ?? buildDefaultBubbleQualityCases(options);
  const skipInfeasible = options.skipInfeasible ?? true;
  const minPerBlock = options.minDialogueHeightPerBlock ?? 32;
  const soft = options.softViolations ?? BUBBLE_QUALITY_SOFT_VIOLATIONS;

  const results: BubbleQualityCaseResult[] = [];

  for (const testCase of cases) {
    if (skipInfeasible && isInfeasible(testCase.bounds, testCase.blocks, minPerBlock)) {
      results.push({
        label: testCase.label,
        bounds: testCase.bounds,
        blocks: testCase.blocks,
        violations: [],
        skipped: true,
        skipReason: 'dialogue zone too short',
      });
      continue;
    }

    const layoutOptions: PanelTextLayoutOptions = {
      placeMode: 'slots',
      allowBubbleEscape: true,
      ...testCase.options,
    };
    const blocks = adaptBlocksToPanelBudget(testCase.blocks, testCase.bounds);
    const layout = layoutPanelTextBlocks(blocks, testCase.bounds, layoutOptions);
    const violations = filterViolations(
      validateSpeechBubbleQuality(layout, {
        bounds: testCase.bounds,
        blocks,
        characterIds: testCase.characterIds ?? characterIdsFromBlocks(blocks),
        allowBubbleEscape: layoutOptions.allowBubbleEscape,
      }),
      soft,
    );

    results.push({
      label: testCase.label,
      bounds: testCase.bounds,
      blocks: testCase.blocks,
      violations,
      skipped: false,
    });
  }

  const skipped = results.filter((row) => row.skipped).length;
  const failures = results.filter((row) => !row.skipped && row.violations.length > 0);
  const passed = results.length - skipped - failures.length;

  return {
    total: results.length,
    passed,
    skipped,
    failed: failures.length,
    failures,
  };
}

export function formatBubbleQualityMatrixReport(report: BubbleQualityMatrixReport): string {
  const lines = [
    `bubble-quality: ${report.passed} passed, ${report.skipped} skipped, ${report.failed} failed (${report.total} total)`,
  ];
  for (const failure of report.failures.slice(0, 24)) {
    lines.push(`  FAIL ${failure.label}: ${formatBubbleQualityReport(failure.violations)}`);
  }
  if (report.failures.length > 24) {
    lines.push(`  … and ${report.failures.length - 24} more failures`);
  }
  return lines.join('\n');
}

/** Stress block sets mirroring Scrapboard mad-libs exchanges. */
export const STRESS_DIALOGUE_BLOCK_SETS: PanelTextBlock[][] = [
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
    { kind: 'dialogue', characterId: 'a', content: 'I told you not to bring the traffic cone.' },
    { kind: 'dialogue', characterId: 'b', content: 'We are absolutely not discussing the haunted accordion again.' },
  ],
  [
    { kind: 'dialogue', characterId: 'a', content: 'Okay but why is there a haunted accordion in panel three?' },
  ],
];

/** Build a large matrix: layout presets × panels × stress block sets. */
export function buildDefaultBubbleQualityCases(
  options: RunBubbleQualityMatrixOptions = {},
): BubbleQualityCase[] {
  const pageW = options.pageWidth ?? DEFAULT_PAGE_W;
  const pageH = options.pageHeight ?? DEFAULT_PAGE_H;
  const margin = options.pageMargin ?? DEFAULT_PAGE_MARGIN;
  const cases: BubbleQualityCase[] = [];

  for (let panelCount = 1; panelCount <= 12; panelCount++) {
    const layouts = generateLayoutsForPanelCount(panelCount, { allowFullBleed: true });
    for (const generated of layouts) {
      for (let panelIndex = 0; panelIndex < generated.panels.length; panelIndex++) {
        const bounds = panelPixelBounds(generated.panels[panelIndex]!, pageW, pageH, margin);
        if (bounds.w < 20 || bounds.h < 36) continue;
        const zones = panelTextZones(bounds);
        const maxHalfW = maxBubbleHalfWidth(bounds, zones.sidePad);
        if (maxHalfW < 10 || bounds.w < 40) continue;

        for (let blockSet = 0; blockSet < STRESS_DIALOGUE_BLOCK_SETS.length; blockSet++) {
          const blocks = STRESS_DIALOGUE_BLOCK_SETS[blockSet]!;
          cases.push({
            label: `n=${panelCount} layout=${generated.id} panel=${panelIndex} blocks=${blockSet}`,
            bounds,
            blocks,
          });
          if (panelCount >= 8 && blockSet >= 2) continue;
        }
      }
    }
  }

  cases.push({
    label: 'medium-hand-panel',
    bounds: { x: 0, y: 0, w: 180, h: 200 },
    blocks: STRESS_DIALOGUE_BLOCK_SETS[0]!,
  });

  cases.push({
    label: 'narrow-tall-panel',
    bounds: { x: 0, y: 0, w: 64, h: 160 },
    blocks: [{ kind: 'dialogue', characterId: 'a', content: 'Skinny panel dialogue.' }],
  });

  return cases;
}
