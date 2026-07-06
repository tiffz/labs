import { buildSubdivisionGrid } from './gridBuilder';
import { positionInSixteenthsForGridIndex } from './metronomeGridPositions';
import type { SubdivisionLevel, SubdivisionType, VoiceMode } from './types';
import {
  getDefaultBeatGrouping,
  isCompoundTimeSignature,
} from '../../rhythm/timeSignatureUtils';
import type { TimeSignature } from '../../rhythm/types';

export type MetronomeDotTier = 'downbeat' | 'beat' | 'subdivision';

export interface MetronomeVisualDot {
  positionInSixteenths: number;
  tier: MetronomeDotTier;
  subdivision: SubdivisionType;
  sampleId?: string;
  silent?: boolean;
}

const TIER_RANK: Record<MetronomeDotTier, number> = {
  downbeat: 3,
  beat: 2,
  subdivision: 1,
};

function tierForSubdivision(subdivision: SubdivisionType): MetronomeDotTier {
  switch (subdivision) {
    case 'accent':
      return 'downbeat';
    case 'quarter':
      return 'beat';
    default:
      return 'subdivision';
  }
}

/**
 * Metronome dot positions aligned with the shared subdivision grid (Count / advanced prefs).
 * Primary beats use tier `downbeat` | `beat`; finer slots use `subdivision`.
 */
export function getMetronomeVisualDots(
  timeSignature: TimeSignature,
  subdivisionLevel: SubdivisionLevel,
  voiceMode: VoiceMode = 'counting',
): MetronomeVisualDot[] {
  const grouping = getDefaultBeatGrouping(timeSignature);
  const grid = buildSubdivisionGrid({
    timeSignature,
    grouping,
    voiceMode,
    subdivisionLevel,
    compound: isCompoundTimeSignature(timeSignature),
  });

  if (grid.length === 0) return [];

  const byPosition = new Map<number, MetronomeVisualDot>();
  grid.forEach((entry, index) => {
    const positionInSixteenths = positionInSixteenthsForGridIndex(
      index,
      timeSignature,
      subdivisionLevel,
      grouping,
    );
    const dot: MetronomeVisualDot = {
      positionInSixteenths,
      tier: tierForSubdivision(entry.subdivision),
      subdivision: entry.subdivision,
      sampleId: entry.sampleId,
      silent: entry.silent,
    };
    const existing = byPosition.get(positionInSixteenths);
    if (!existing || TIER_RANK[dot.tier] > TIER_RANK[existing.tier]) {
      byPosition.set(positionInSixteenths, dot);
    }
  });

  return Array.from(byPosition.values()).sort(
    (a, b) => a.positionInSixteenths - b.positionInSixteenths,
  );
}

export function getMetronomeVisualPositions(
  timeSignature: TimeSignature,
  subdivisionLevel: SubdivisionLevel,
  voiceMode: VoiceMode = 'counting',
): number[] {
  return getMetronomeVisualDots(timeSignature, subdivisionLevel, voiceMode).map(
    (d) => d.positionInSixteenths,
  );
}

/** Whether rhythm playback should audibly click at this visual dot. */
export function shouldClickAtVisualDot(
  dot: MetronomeVisualDot,
  subdivisionLevel: SubdivisionLevel,
): boolean {
  if (dot.silent) return false;
  if (subdivisionLevel === 1) {
    return dot.tier === 'downbeat' || dot.tier === 'beat';
  }
  return true;
}

export function metronomeDotRadiusPx(
  tier: MetronomeDotTier,
  subdivision?: SubdivisionType,
): number {
  switch (tier) {
    case 'downbeat':
      return 4.5;
    case 'beat':
      return 4;
    case 'subdivision':
      if (subdivision === 'sixteenth') return 1.85;
      return 2.25;
  }
}

export function metronomeDotRadius(
  tier: MetronomeDotTier,
  subdivision?: SubdivisionType,
): string {
  return String(metronomeDotRadiusPx(tier, subdivision));
}

export function metronomeDotIdleFill(tier: MetronomeDotTier, subdivisionFill = '#9ca3af', beatFill = '#6b7280'): string {
  return tier === 'subdivision' ? subdivisionFill : beatFill;
}
