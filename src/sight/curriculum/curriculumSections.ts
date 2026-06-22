import { PHASE_LABELS, type CurriculumPhase } from './phases';
import { LEVEL_TABLE } from '../levels';
import type { LevelConfig } from '../types';

export interface CurriculumSection {
  phase: CurriculumPhase;
  label: string;
  description: string;
  levels: LevelConfig[];
}

const SECTION_COPY: Record<CurriculumPhase, string> = {
  isolated:
    'Quick comparisons on neutral fields — value, chroma, and temperature before context gets loud.',
  relational:
    'Albers-style fields — read identity and perceived color through surrounding hues.',
  calibration:
    'Slider matching and broken bridges — align Oklch to what you see.',
  harmony:
    'Gamut masks and harmony wheels — where usable color lives on the wheel.',
  subtractive:
    'Perceived match across warm and cool fields — subtractive mixing in practice.',
  dimensional:
    'Value and chroma outliers in a five-swatch grid — read one dimension at a time.',
  atmospheric:
    'Light presets and flat scene color — atmospheric cast under controlled scenes.',
};

const PHASE_ORDER: CurriculumPhase[] = [
  'isolated',
  'relational',
  'calibration',
  'harmony',
  'subtractive',
  'dimensional',
  'atmospheric',
];

export function curriculumSections(): CurriculumSection[] {
  return PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    description: SECTION_COPY[phase],
    levels: LEVEL_TABLE.filter((row) => row.phase === phase),
  }));
}

export type LevelStatus = 'locked' | 'current' | 'complete';

export function levelStatus(
  profileLevel: number,
  level: number,
  peakLevel?: number,
): LevelStatus {
  const peak = peakLevel ?? profileLevel;
  if (level > peak) return 'locked';
  if (level < profileLevel) return 'complete';
  if (level === profileLevel) return 'current';
  return 'complete';
}
