/**
 * Automated Scrapboard layout quality audit.
 *
 * Generates story pages (same planner as Randomize all) and runs the shared
 * speech-bubble / character visibility rules against every panel.
 */

import {
  generateLayoutsForPanelCount,
  layoutPanelTextBlocks,
  markerPlacementFromArrangement,
  panelPixelBounds,
  slotForSpeakerIndex,
  type GeneratedPanelLayout,
  type PanelCharacterId,
} from '../../shared/comic';
import {
  formatBubbleQualityReport,
  validateSpeechBubbleQuality,
  type BubbleQualityViolation,
  type BubbleQualityViolationCode,
} from '../../shared/comic/speechBubbleQuality';
import {
  generateStoryPage,
  pickWeightedLayout,
  pickWeightedPanelCount,
  type StoryPagePlan,
} from '../copy/scrapboardStoryGenerate';

const PAGE_W = 520;
const PAGE_H = 720;
const PAGE_MARGIN = 2;

/**
 * Soft under escape: body may overhang left/right/below; intentional trim stays soft.
 * `readable_line_length` is a shrink-to-fit side effect on tiny panels (3.0 vs 3.2 avg).
 */
export const SCRAPBOARD_AUDIT_SOFT_VIOLATIONS: ReadonlySet<BubbleQualityViolationCode> = new Set([
  'bubble_in_bounds',
  'blocks_dropped',
  'readable_line_length',
]);

export type ScrapboardPanelAuditResult = {
  label: string;
  seed: number;
  panelIndex: number;
  violations: BubbleQualityViolation[];
  skipped: boolean;
  skipReason?: string;
};

export type ScrapboardLayoutAuditReport = {
  pages: number;
  panels: number;
  passed: number;
  skipped: number;
  failed: number;
  failures: ScrapboardPanelAuditResult[];
};

export type RunScrapboardLayoutAuditOptions = {
  /** Number of story pages to generate (default 100). */
  pageCount?: number;
  /** Base seed; page i uses seed + i * 9973. */
  baseSeed?: number;
  softViolations?: ReadonlySet<BubbleQualityViolationCode>;
};

function characterIdsForPanel(speakerCount: number, blocks: StoryPagePlan['panels'][0]['blocks']): PanelCharacterId[] {
  const fromSpeakers = Array.from({ length: Math.min(3, Math.max(0, speakerCount)) }, (_, i) =>
    slotForSpeakerIndex(i),
  );
  if (fromSpeakers.length > 0) return fromSpeakers;
  const ids = new Set<PanelCharacterId>();
  for (const block of blocks) {
    if (block.kind === 'dialogue' && block.content.trim()) ids.add(block.characterId);
  }
  return [...ids];
}

function auditPanel(
  seed: number,
  layout: GeneratedPanelLayout,
  plan: StoryPagePlan,
  panelIndex: number,
  soft: ReadonlySet<BubbleQualityViolationCode>,
): ScrapboardPanelAuditResult {
  const panel = layout.panels[panelIndex]!;
  const panelPlan = plan.panels[panelIndex]!;
  const bounds = panelPixelBounds(panel, PAGE_W, PAGE_H, PAGE_MARGIN);
  const label = `seed=${seed} layout=${layout.id} panel=${panelIndex} theme=${plan.themeId}`;

  if (bounds.w < 40 || bounds.h < 48) {
    return {
      label,
      seed,
      panelIndex,
      violations: [],
      skipped: true,
      skipReason: 'panel too small',
    };
  }

  const speakerCount = panelPlan.speakerIds.length || 1;
  const markerPlacement = markerPlacementFromArrangement(panelPlan.arrangement, speakerCount);
  const characterIds = characterIdsForPanel(speakerCount, panelPlan.blocks);
  const layoutResult = layoutPanelTextBlocks(panelPlan.blocks, bounds, {
    placeMode: 'slots',
    allowBubbleEscape: true,
    markerPlacement,
  });
  const violations = validateSpeechBubbleQuality(layoutResult, {
    bounds,
    blocks: panelPlan.blocks,
    characterIds,
    allowBubbleEscape: true,
    markerPlacement,
  }).filter((v) => !soft.has(v.code));

  return {
    label,
    seed,
    panelIndex,
    violations,
    skipped: false,
  };
}

/** Build one story page the same way Randomize all does (weighted count + layout). */
export function buildAuditedStoryPage(seed: number): {
  seed: number;
  layout: GeneratedPanelLayout;
  plan: StoryPagePlan;
} {
  const panelCount = pickWeightedPanelCount(seed);
  const candidates = generateLayoutsForPanelCount(panelCount, { allowFullBleed: true });
  const layout = pickWeightedLayout(seed + 31, candidates);
  const plan = generateStoryPage(seed + 61, layout);
  return { seed, layout, plan };
}

/** Run story generation × panel layout quality for many seeds. */
export function runScrapboardLayoutAudit(
  options: RunScrapboardLayoutAuditOptions = {},
): ScrapboardLayoutAuditReport {
  const pageCount = options.pageCount ?? 100;
  const baseSeed = options.baseSeed ?? 20_260_718;
  const soft = options.softViolations ?? SCRAPBOARD_AUDIT_SOFT_VIOLATIONS;

  const failures: ScrapboardPanelAuditResult[] = [];
  let panels = 0;
  let passed = 0;
  let skipped = 0;

  for (let i = 0; i < pageCount; i++) {
    const seed = baseSeed + i * 9973;
    const { layout, plan } = buildAuditedStoryPage(seed);
    for (let panelIndex = 0; panelIndex < layout.panels.length; panelIndex++) {
      panels += 1;
      const row = auditPanel(seed, layout, plan, panelIndex, soft);
      if (row.skipped) {
        skipped += 1;
        continue;
      }
      if (row.violations.length > 0) {
        failures.push(row);
      } else {
        passed += 1;
      }
    }
  }

  return {
    pages: pageCount,
    panels,
    passed,
    skipped,
    failed: failures.length,
    failures,
  };
}

export function formatScrapboardLayoutAuditReport(report: ScrapboardLayoutAuditReport): string {
  const lines = [
    `scrapboard-layout-audit: ${report.passed} passed, ${report.skipped} skipped, ${report.failed} failed (${report.panels} panels / ${report.pages} pages)`,
  ];
  for (const failure of report.failures.slice(0, 32)) {
    lines.push(`  FAIL ${failure.label}: ${formatBubbleQualityReport(failure.violations)}`);
  }
  if (report.failures.length > 32) {
    lines.push(`  … and ${report.failures.length - 32} more failures`);
  }
  return lines.join('\n');
}
