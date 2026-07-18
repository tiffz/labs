/**
 * Speech-bubble layout quality rules — benchmarks for readable comic dialogue.
 *
 * Used by fuzz/stress tests and CI; extend when a visual defect becomes a rule.
 */

import {
  bubbleTextBlockHeight,
  charWidthForFont,
  tailMouthChordCrossesInterior,
  type BubbleMetrics,
} from './speechBubblePath';
import {
  validateSpeechBubbleGeometry,
  type PathGeometryViolationCode,
} from './speechBubblePathGeometry';
import type {
  LayoutBounds,
  PanelTextLayout,
  PanelTextLayoutOptions,
  SpeechBubbleLayout,
} from './speechBubbleLayout';
import { bubblesTailsOverlap } from './speechBubbleTailOverlap';
import type { PanelCharacterId, PanelTextBlock } from './types';
import { validatePanelTextLayout, type LayoutViolationCode } from './panelTextLayoutInvariants';

export type BubbleQualityViolationCode =
  | LayoutViolationCode
  | PathGeometryViolationCode
  | 'text_fits_bubble_height'
  | 'bubble_aspect_ratio'
  | 'readable_line_length'
  | 'blocks_dropped'
  | 'tail_too_long'
  | 'tail_crosses_interior'
  | 'tail_overlap';

export type BubbleQualityViolation = {
  code: BubbleQualityViolationCode;
  message: string;
  itemIndex?: number;
};

export type BubbleQualityThresholds = {
  /** halfH / halfW must be at least this (avoid vertical slivers). */
  minAspect: number;
  /** halfH / halfW must be at most this (avoid flat pancakes). */
  maxAspect: number;
  /** Max tail length as a fraction of panel height. */
  maxTailLengthRatio: number;
  /** Minimum average characters per line when multiple lines. */
  minAvgCharsMultiLine: number;
  /** Single-character lines are only allowed on the last line. */
  minSingleLineChars: number;
};

export const DEFAULT_BUBBLE_QUALITY_THRESHOLDS: BubbleQualityThresholds = {
  minAspect: 0.22,
  maxAspect: 1.15,
  maxTailLengthRatio: 0.72,
  minAvgCharsMultiLine: 3.2,
  minSingleLineChars: 2,
};

export type ValidateSpeechBubbleQualityOptions = PanelTextLayoutOptions & {
  bounds: LayoutBounds;
  blocks: PanelTextBlock[];
  characterIds?: PanelCharacterId[];
  thresholds?: Partial<BubbleQualityThresholds>;
};

function activeBlocks(blocks: PanelTextBlock[]): PanelTextBlock[] {
  return blocks.filter((block) => block.content.trim().length > 0);
}

function bubbleAspect(bubble: SpeechBubbleLayout): number {
  return bubble.halfH / Math.max(bubble.halfW, 1);
}

function innerTextHeight(metrics: BubbleMetrics, lineCount: number): number {
  return bubbleTextBlockHeight(lineCount, metrics.lineHeight, metrics.fontSize);
}

function bubbleQualityViolations(
  bubble: SpeechBubbleLayout,
  itemIndex: number,
  bounds: LayoutBounds,
  thresholds: BubbleQualityThresholds,
): BubbleQualityViolation[] {
  const violations: BubbleQualityViolation[] = [];
  const aspect = bubbleAspect(bubble);
  if (aspect + 1e-6 < thresholds.minAspect) {
    violations.push({
      code: 'bubble_aspect_ratio',
      message: `Bubble ${itemIndex + 1} is too narrow (aspect ${aspect.toFixed(2)})`,
      itemIndex,
    });
  }
  if (aspect > thresholds.maxAspect) {
    violations.push({
      code: 'bubble_aspect_ratio',
      message: `Bubble ${itemIndex + 1} is too flat (aspect ${aspect.toFixed(2)})`,
      itemIndex,
    });
  }

  const innerH = bubble.halfH * 2 - bubble.metrics.padY * 2;
  const textH = innerTextHeight(bubble.metrics, bubble.lines.length);
  if (textH > innerH + 1) {
    violations.push({
      code: 'text_fits_bubble_height',
      message: `Bubble ${itemIndex + 1} text exceeds vertical padding`,
      itemIndex,
    });
  }

  const innerW = bubble.halfW * 2 - bubble.metrics.padX * 2;
  const charW = charWidthForFont(bubble.metrics.fontSize);
  for (const line of bubble.lines) {
    if (line.length * charW > innerW + 1) {
      violations.push({
        code: 'text_fits_bubble',
        message: `Bubble ${itemIndex + 1} line exceeds width`,
        itemIndex,
      });
      break;
    }
  }

  if (bubble.lines.length > 1) {
    const avgChars = bubble.lines.reduce((sum, line) => sum + line.length, 0) / bubble.lines.length;
    if (avgChars < thresholds.minAvgCharsMultiLine) {
      violations.push({
        code: 'readable_line_length',
        message: `Bubble ${itemIndex + 1} lines are too short on average (${avgChars.toFixed(1)} chars)`,
        itemIndex,
      });
    }
    for (let lineIndex = 0; lineIndex < bubble.lines.length - 1; lineIndex++) {
      const line = bubble.lines[lineIndex]!;
      if (line.length < thresholds.minSingleLineChars) {
        violations.push({
          code: 'readable_line_length',
          message: `Bubble ${itemIndex + 1} line ${lineIndex + 1} is a single-letter stack`,
          itemIndex,
        });
        break;
      }
    }
  }

  const tailDistance = Math.abs(bubble.tailY - (bubble.cy + bubble.halfH));
  if (tailDistance > bounds.h * thresholds.maxTailLengthRatio) {
    violations.push({
      code: 'tail_too_long',
      message: `Bubble ${itemIndex + 1} tail spans too much of the panel`,
      itemIndex,
    });
  }

  if (
    tailMouthChordCrossesInterior(
      bubble.cx,
      bubble.cy,
      bubble.halfW,
      bubble.halfH,
      bubble.tailX,
      bubble.tailY,
    )
  ) {
    violations.push({
      code: 'tail_crosses_interior',
      message: `Bubble ${itemIndex + 1} tail mouth chords through the body`,
      itemIndex,
    });
  }

  return violations;
}

/** Stricter validation: geometry invariants + readability benchmarks. */
export function validateSpeechBubbleQuality(
  layout: PanelTextLayout,
  options: ValidateSpeechBubbleQualityOptions,
): BubbleQualityViolation[] {
  const thresholds = { ...DEFAULT_BUBBLE_QUALITY_THRESHOLDS, ...options.thresholds };
  const { bounds, blocks, characterIds = [] } = options;

  const base = validatePanelTextLayout(layout, blocks, {
    bounds,
    allowBubbleEscape: options.allowBubbleEscape,
    characterIds,
    markerPlacement: options.markerPlacement,
  }) as BubbleQualityViolation[];

  const active = activeBlocks(blocks);
  if (layout.items.length < active.length) {
    base.push({
      code: 'blocks_dropped',
      message: `Rendered ${layout.items.length} of ${active.length} text blocks`,
    });
  }

  const bubbleEntries: Array<{ index: number; layout: SpeechBubbleLayout }> = [];
  for (let i = 0; i < layout.items.length; i++) {
    const item = layout.items[i]!;
    if (item.kind !== 'bubble') continue;
    bubbleEntries.push({ index: i, layout: item.layout });
    base.push(...bubbleQualityViolations(item.layout, i, bounds, thresholds));
    for (const geometryViolation of validateSpeechBubbleGeometry(item.layout)) {
      base.push({
        code: geometryViolation.code,
        message: `Bubble ${i + 1}: ${geometryViolation.message}`,
        itemIndex: i,
      });
    }
  }

  for (let i = 0; i < bubbleEntries.length; i++) {
    for (let j = i + 1; j < bubbleEntries.length; j++) {
      const a = bubbleEntries[i]!;
      const b = bubbleEntries[j]!;
      // Same speaker shares a mouth tip — wedge overlap is expected; skip pair check.
      if (a.layout.characterId === b.layout.characterId) continue;
      if (bubblesTailsOverlap(a.layout, b.layout)) {
        base.push({
          code: 'tail_overlap',
          message: `Bubbles ${a.index + 1} and ${b.index + 1} have overlapping tails`,
          itemIndex: a.index,
        });
      }
    }
  }

  return base;
}

export function formatBubbleQualityReport(violations: BubbleQualityViolation[]): string {
  if (violations.length === 0) return 'ok';
  return violations.map((v) => `${v.code}: ${v.message}`).join('; ');
}

/** @internal Test helper — assert zero violations with a readable label. */
export function expectBubbleQuality(
  layout: PanelTextLayout,
  options: ValidateSpeechBubbleQualityOptions,
  label: string,
): BubbleQualityViolation[] {
  const violations = validateSpeechBubbleQuality(layout, options);
  if (violations.length > 0) {
    throw new Error(`${label}: ${formatBubbleQualityReport(violations)}`);
  }
  return violations;
}
