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
    'Albers-style fields and atmospheric casts — read color through surrounding hues.',
  calibration:
    'Slider matching, broken bridges, and subtractive equalizers — align Oklch to what you see.',
  harmony:
    'Gamut masks and harmony wheels — where usable color lives on the wheel.',
};

const PHASE_ORDER: CurriculumPhase[] = ['isolated', 'relational', 'calibration', 'harmony'];

export function curriculumSections(): CurriculumSection[] {
  return PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    description: SECTION_COPY[phase],
    levels: LEVEL_TABLE.filter((row) => row.phase === phase),
  }));
}

export type LevelStatus = 'locked' | 'current' | 'complete';

export function levelStatus(profileLevel: number, level: number): LevelStatus {
  if (level < profileLevel) return 'complete';
  if (level === profileLevel) return 'current';
  return 'locked';
}
