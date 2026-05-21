import type { LevelConfig } from './types';

export const CURRICULUM_SCHEMA_VERSION = 3;

export const LEVEL_TABLE: LevelConfig[] = [
  { level: 1, module: 'compare', label: 'Light vs dark', compareProfile: 'light' },
  { level: 2, module: 'compare', label: 'Saturation', compareProfile: 'saturationEasy' },
  { level: 3, module: 'compare', label: 'Saturation (tricky)', compareProfile: 'saturationHard' },
  { level: 4, module: 'compare', label: 'Mixed comparisons', compareProfile: 'mixed' },
  {
    level: 5,
    module: 'contextual',
    label: 'Match side by side',
    contextualProfile: 'adjacentFlat',
    maxDeltaE: 6.0,
  },
  {
    level: 6,
    module: 'contextual',
    label: 'Match on gray',
    contextualProfile: 'flatNeutral',
    maxDeltaE: 5.0,
  },
  {
    level: 7,
    module: 'contextual',
    label: 'Value in context',
    contextualProfile: 'valueLocked',
    maxDeltaE: 5.0,
  },
  {
    level: 8,
    module: 'contextual',
    label: 'Value + saturation',
    contextualProfile: 'hueLocked',
    maxDeltaE: 4.0,
  },
  {
    level: 9,
    module: 'contextual',
    label: 'Full match',
    contextualProfile: 'full',
    maxDeltaE: 3.5,
  },
  {
    level: 10,
    module: 'bridge',
    label: 'Single-axis bridge',
    bridgeProfile: 'singleAxis',
    maxBridgeVariancePct: 6,
  },
  {
    level: 11,
    module: 'bridge',
    label: 'Warm–cool bridge',
    bridgeProfile: 'warmCool',
    maxBridgeVariancePct: 4,
  },
  {
    level: 12,
    module: 'gamut',
    label: 'Wide gamut mask',
    gamutProfile: 'wide',
    minGamutOverlapPct: 85,
  },
  {
    level: 13,
    module: 'gamut',
    label: 'Compressed gamut',
    gamutProfile: 'compressed',
    minGamutOverlapPct: 90,
  },
];

export const MAX_LEVEL = LEVEL_TABLE.length;

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(LEVEL_TABLE.length, Math.floor(level)));
  return LEVEL_TABLE[clamped - 1]!;
}

export function maxUnlockedLevel(profileLevel: number): number {
  return Math.max(1, Math.min(LEVEL_TABLE.length, Math.floor(profileLevel)));
}
